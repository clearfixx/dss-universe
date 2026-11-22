/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-topics.ts
 *
 * 🎯 Purpose:
 * Implements CH-1a: topics, numbered posts, immutable revisions, edit windows,
 * close/reopen, the global posting cooldown and owner interaction decisions.
 *
 * ⚠️ Important:
 * • replies lock the topic row so post numbers stay gap-free and unique;
 * • the 60-second cooldown is one atomic conditional upsert;
 * • media and Content Gate nodes are rejected until CH-3 delivers ownership
 *   checks and server-side redaction for Forum.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { collectEditorMediaIds } from '@dss/editor';
import { Prisma, type ForumPost, type ForumTopic } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  EDITOR_DELIVERY_READER,
  EDITOR_VIEWER_DOCUMENT_PROJECTOR,
  type EditorDeliveryReader,
  type EditorViewerDocumentProjector,
  EDITOR_DOCUMENT_NORMALIZER,
  type EditorDocumentNormalizer,
  type ValidatedEditorDocument,
} from '@api/modules/editor';
import {
  FORUM_VIEWER_FACTS,
  type ForumViewerFactsReader,
} from '../contracts/forum-viewer-facts.contract';
import type { ForumInteractionDecisions } from '../contracts/forum-interaction-decisions.contract';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import { canSeeCategory } from '../domain/forum-structure.rules';
import {
  DEFAULT_FORUM_RANKING,
  topPeriodStart,
  type ForumTopPeriod,
} from '../domain/forum-rating.rules';
import {
  canCloseTopic,
  canEditPost,
  canReopenTopic,
  normalizePostReferences,
  normalizeTopicTitle,
} from '../domain/forum-topic.rules';
import type { ForumViewerFacts } from '../domain/types/forum-structure.type';
import {
  FORUM_POSTING_COOLDOWN_SECONDS,
  type ForumPage,
  type ForumPostView,
  type ForumTopicKind,
  type ForumStaffNoteView,
  type ForumTopicFacets,
  type ForumTopicFilter,
  type ForumViewerCollection,
  type ForumTopicScope,
  type ForumReplySort,
  type ForumTopicSort,
  type ForumTopicState,
  type ForumTopicSummary,
} from '../domain/types/forum-topic.type';
import { ForumStructureService } from './prisma-forum-structure';
import { ForumAccessPolicy } from './forum-access.policy';
import {
  atLeastRole,
  viewerRole,
  type ForumAccessGrant,
  type ForumAccessRole,
} from '../domain/forum-access.rules';
import { gateBlockKinds } from '../domain/forum-section-limits.rules';
import { FORUM_POST_MEDIA, type ForumPostMedia } from './forum-post-media.port';

const PRODUCER = 'dss.api.forum';
const TOPIC_KIND = 'forum.topic';
const MAX_PAGE = 50;
const MEDIA_NODES = new Set(['mediaReference', 'attachment']);
const GATE_NODE = 'contentGate';

type SectionScope = {
  id: string;
  parentId: string | null;
  allowTopics: boolean;
  allowReplies: boolean;
  allowPolls: boolean;
  allowAttachments: boolean;
  pinnedLimit: number | null;
  attachmentMaxMb: number | null;
  attachmentFormats: string[];
  gateViewRole: ForumAccessRole;
  gateCreateRole: ForumAccessRole;
  gateBlockTypes: string[];
  grant: ForumAccessGrant;
};

type VisibleTopic = {
  topic: ForumTopic;
  categoryId: string;
  allowsGatedContent: boolean;
  viewer: ForumViewerFacts;
  forum: SectionScope;
};

@Injectable()
export class ForumTopicsService implements ForumInteractionDecisions {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    @Inject(FORUM_VIEWER_FACTS)
    private readonly viewers: ForumViewerFactsReader,
    @Inject(EDITOR_DOCUMENT_NORMALIZER)
    private readonly editor: EditorDocumentNormalizer,
    private readonly structure: ForumStructureService,
    @Inject(EDITOR_DELIVERY_READER)
    private readonly gateAccess: EditorDeliveryReader,
    @Inject(EDITOR_VIEWER_DOCUMENT_PROJECTOR)
    private readonly projector: EditorViewerDocumentProjector,
    // Optional: without Media wiring, posts with media are rejected (pre-CH-3c).
    @Optional()
    @Inject(FORUM_POST_MEDIA)
    private readonly media?: ForumPostMedia,
  ) {}

  private policy?: ForumAccessPolicy;
  /** Section role matrices (created lazily; no extra DI dependency). */
  private get access(): ForumAccessPolicy {
    return (this.policy ??= new ForumAccessPolicy(this.prisma));
  }

  async createTopic(
    actorId: string,
    input: {
      forumId: string;
      kind: ForumTopicKind;
      title: string;
      documentJson: string;
    },
  ): Promise<{ topic: ForumTopicSummary; firstPostId: string }> {
    const viewer = await this.authenticated(actorId);
    const forum = await this.visibleForum(input.forumId, viewer);
    if (!forum.allowTopics || !forum.grant.createTopics) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        'New topics are not accepted in this section.',
      );
    }
    const title = normalizeTopicTitle(input.title);
    const content = this.content(
      input.documentJson,
      'topic',
      forum.allowsGatedContent,
    );
    await this.requireDocumentAccess(actorId, content.document);
    this.requireGateRules(viewer, forum, content.document);
    const mediaIds = await this.attachableMedia(actorId, content.document, []);
    this.requireAttachmentsAllowed(forum, mediaIds);
    await this.requireAttachmentLimits(actorId, forum, mediaIds, []);
    const exempt = await this.cooldownExempt(viewer, forum.categoryId);
    const topicId = randomUUID();
    const postId = randomUUID();
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await this.cooldown(tx, actorId, now, exempt);
      const targetId = randomUUID();
      await tx.interactionTarget.create({
        data: {
          id: targetId,
          kind: TOPIC_KIND,
          ownerModule: 'forum',
          ownerType: 'ForumTopic',
          ownerId: topicId,
        },
      });
      await tx.forumTopic.create({
        data: {
          id: topicId,
          forumId: forum.id,
          interactionTargetId: targetId,
          authorId: actorId,
          kind: input.kind,
          title,
          lastPostAt: now,
          lastPostAuthorId: actorId,
          createdAt: now,
        },
      });
      await this.insertPost(tx, {
        id: postId,
        topicId,
        number: 1,
        authorId: actorId,
        content,
        replyToNumber: null,
        quotedNumbers: [],
        createdAt: now,
      });
      await this.syncMedia(tx, postId, actorId, mediaIds);
      await this.record(tx, actorId, 'ForumTopic', topicId, 'topic.created', {
        forumId: forum.id,
        categoryId: forum.categoryId,
        kind: input.kind,
        firstPostId: postId,
        authorId: actorId,
        title,
      });
    });
    return { topic: await this.summary(topicId), firstPostId: postId };
  }

  async reply(
    actorId: string,
    input: {
      topicId: string;
      documentJson: string;
      replyToNumber: number | null;
      quotedNumbers: number[];
    },
  ): Promise<ForumPostView> {
    const viewer = await this.authenticated(actorId);
    const { categoryId, allowsGatedContent, forum } = await this.visibleTopic(
      input.topicId,
      viewer,
    );
    if (!forum.allowReplies || !forum.grant.reply) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        'Replies are not accepted in this section.',
      );
    }
    const content = this.content(
      input.documentJson,
      'reply',
      allowsGatedContent,
    );
    await this.requireDocumentAccess(actorId, content.document);
    this.requireGateRules(viewer, forum, content.document);
    const mediaIds = await this.attachableMedia(actorId, content.document, []);
    this.requireAttachmentsAllowed(forum, mediaIds);
    await this.requireAttachmentLimits(actorId, forum, mediaIds, []);
    const exempt = await this.cooldownExempt(viewer, categoryId);
    const postId = randomUUID();
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<
        Array<{ state: string; lastPostNumber: number }>
      >`SELECT "state", "lastPostNumber" FROM "forum_topics" WHERE "id" = ${input.topicId} FOR UPDATE`;
      if (!locked) this.notFound('Topic');
      if (locked.state !== 'OPEN') {
        throw new ForumCommandError(
          'CONFLICT',
          'Replies are allowed only in open topics.',
        );
      }
      const number = locked.lastPostNumber + 1;
      const references = normalizePostReferences(
        input.replyToNumber,
        input.quotedNumbers,
        number,
      );
      await this.cooldown(tx, actorId, now, exempt);
      await this.insertPost(tx, {
        id: postId,
        topicId: input.topicId,
        number,
        authorId: actorId,
        content,
        ...references,
        createdAt: now,
      });
      await tx.forumTopic.update({
        where: { id: input.topicId },
        data: {
          postCount: { increment: 1 },
          lastPostNumber: number,
          lastPostAt: now,
          lastPostAuthorId: actorId,
        },
      });
      await this.syncMedia(tx, postId, actorId, mediaIds);
      await this.record(tx, actorId, 'ForumPost', postId, 'post.created', {
        topicId: input.topicId,
        number,
        replyToNumber: references.replyToNumber,
        authorId: actorId,
      });
    });
    return this.postView(
      await this.prisma.forumPost.findUniqueOrThrow({ where: { id: postId } }),
      false,
      [],
    );
  }

  async editPost(
    actorId: string,
    input: {
      postId: string;
      expectedRevision: number;
      documentJson: string;
      title?: string | null;
    },
  ): Promise<ForumPostView> {
    const viewer = await this.authenticated(actorId);
    const post = await this.prisma.forumPost.findUnique({
      where: { id: input.postId },
    });
    if (!post) this.notFound('Post');
    const { topic, categoryId, allowsGatedContent, forum } =
      await this.visibleTopic(post.topicId, viewer);
    const actor = {
      id: actorId,
      moderator: await this.isModerator(viewer, categoryId, forum),
    };
    if (
      post.state !== 'VISIBLE' ||
      (!actor.moderator && !forum.grant.editOwn) ||
      !canEditPost(topic, post, actor, new Date())
    ) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        'You can no longer edit this post.',
      );
    }
    if (input.title != null && post.number !== 1) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        'Only the first post can change the topic title.',
      );
    }
    const title = input.title != null ? normalizeTopicTitle(input.title) : null;
    const content = this.content(
      input.documentJson,
      post.number === 1 ? 'topic' : 'reply',
      allowsGatedContent,
    );
    // Editing must never silently drop hidden blocks the editor cannot read.
    await this.requireDocumentAccess(actorId, post.document);
    await this.requireDocumentAccess(actorId, content.document);
    this.requireGateRules(viewer, forum, content.document);
    // Files the post already references stay; only new ones need the actor's access.
    const referenced = this.media
      ? await this.media.activeMediaIds(post.id)
      : [];
    const mediaIds = await this.attachableMedia(
      actorId,
      content.document,
      referenced,
    );
    this.requireAttachmentsAllowed(
      forum,
      mediaIds.filter((id) => !referenced.includes(id)),
    );
    await this.requireAttachmentLimits(actorId, forum, mediaIds, referenced);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const nextRevision = input.expectedRevision + 1;
      const updated = await tx.forumPost.updateMany({
        where: {
          id: post.id,
          revision: input.expectedRevision,
          state: 'VISIBLE',
        },
        data: {
          document: content.document as unknown as Prisma.InputJsonValue,
          plainText: content.plainText,
          searchText: content.searchText,
          revision: nextRevision,
          editedAt: now,
          lastEditorId: actorId,
        },
      });
      if (updated.count !== 1) {
        throw new ForumCommandError(
          'CONFLICT',
          'The post changed since you opened it.',
        );
      }
      await tx.forumPostRevision.create({
        data: {
          postId: post.id,
          revision: nextRevision,
          document: content.document as unknown as Prisma.InputJsonValue,
          plainText: content.plainText,
          editorId: actorId,
          createdAt: now,
        },
      });
      if (title !== null) {
        await tx.forumTopic.update({
          where: { id: topic.id },
          data: { title },
        });
      }
      await this.syncMedia(tx, post.id, actorId, mediaIds, true);
      await this.record(tx, actorId, 'ForumPost', post.id, 'post.edited', {
        topicId: topic.id,
        number: post.number,
        revision: nextRevision,
        byModerator: actor.moderator && actorId !== post.authorId,
      });
    });
    const staffNotes = await this.staffNotes([post.id]);
    return this.postView(
      await this.prisma.forumPost.findUniqueOrThrow({ where: { id: post.id } }),
      false,
      staffNotes.get(post.id) ?? [],
    );
  }

  async closeTopic(
    actorId: string,
    topicId: string,
  ): Promise<ForumTopicSummary> {
    return this.transition(actorId, topicId, 'CLOSED');
  }

  async reopenTopic(
    actorId: string,
    topicId: string,
  ): Promise<ForumTopicSummary> {
    return this.transition(actorId, topicId, 'OPEN');
  }

  async topics(
    viewerId: string | null,
    forumId: string,
    sort: ForumTopicSort,
    page: number,
    limit: number,
    scope: ForumTopicScope = 'ACTIVE',
    topPeriod: ForumTopPeriod = 'WEEK',
    tagSlug: string | null = null,
    filter: ForumTopicFilter = 'ALL',
    kind: ForumTopicKind | null = null,
  ): Promise<ForumPage<ForumTopicSummary>> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const forum = await this.visibleForum(forumId, viewer);
    if (!forum.grant.read) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        'You cannot read topics in this section.',
      );
    }
    if (filter === 'MINE' && !viewer.subjectId) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        'Sign in to see your own topics.',
      );
    }
    const filterWhere = this.filterWhere(filter, viewer.subjectId);
    if (
      scope === 'TRASHED' &&
      !(await this.isModerator(viewer, forum.categoryId, forum))
    ) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        'Only moderators can open the trash.',
      );
    }
    const { skip, take, safePage } = this.paging(page, limit);
    const where: Prisma.ForumTopicWhereInput = {
      forumId,
      mergedIntoTopicId: null,
      state:
        scope === 'ACTIVE'
          ? { in: ['OPEN', 'CLOSED'] }
          : scope === 'ARCHIVED'
            ? 'ARCHIVED'
            : 'TRASHED',
      ...filterWhere,
      ...(kind ? { kind } : {}),
    };
    const since = sort === 'TOP' ? topPeriodStart(topPeriod, new Date()) : null;
    if (since) where.createdAt = { gte: since };
    if (tagSlug) where.tags = { some: { tag: { slug: tagSlug, forumId } } };
    const [rows, total] = await Promise.all([
      sort === 'HOT' || sort === 'TOP'
        ? this.rankedTopics(
            forumId,
            scope === 'ACTIVE'
              ? ['OPEN', 'CLOSED']
              : [scope === 'ARCHIVED' ? 'ARCHIVED' : 'TRASHED'],
            since,
            tagSlug,
            sort,
            skip,
            take,
            filter,
            viewer.subjectId,
            kind,
          )
        : this.prisma.forumTopic.findMany({
            where,
            orderBy: [
              { pinned: 'desc' },
              sort === 'NEW' ? { createdAt: 'desc' } : { lastPostAt: 'desc' },
              { id: 'desc' },
            ],
            skip,
            take,
          }),
      this.prisma.forumTopic.count({ where }),
    ]);
    const ids = rows.map(({ id }) => id);
    const reads = await this.readStates(viewer, ids);
    const tags = await this.topicTags(ids);
    return {
      items: rows.map((row) =>
        this.toSummary(
          row,
          viewer.subjectId ? (reads.get(row.id) ?? 0) : null,
          tags.get(row.id) ?? [],
        ),
      ),
      total,
      page: safePage,
      limit: take,
    };
  }

  /**
   * Topics across every forum the viewer can see (guests included), for hub
   * blocks such as "Needs help" (UNSOLVED) or "No replies yet" (NO_REPLIES).
   * Open and closed topics only; newest first or by last activity.
   */
  async discoverTopics(
    viewerId: string | null,
    filter: Exclude<ForumTopicFilter, 'MINE'>,
    sort: 'NEW' | 'LAST_ACTIVITY',
    page: number,
    limit: number,
  ): Promise<ForumPage<ForumTopicSummary>> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const { skip, take, safePage } = this.paging(page, limit);
    const where: Prisma.ForumTopicWhereInput = {
      forumId: { in: await this.visibleForumIds(viewer) },
      mergedIntoTopicId: null,
      state: { in: ['OPEN', 'CLOSED'] },
      ...this.filterWhere(filter, viewer.subjectId),
    };
    const [rows, total] = await Promise.all([
      this.prisma.forumTopic.findMany({
        where,
        orderBy: [
          sort === 'NEW' ? { createdAt: 'desc' } : { lastPostAt: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take,
      }),
      this.prisma.forumTopic.count({ where }),
    ]);
    const ids = rows.map(({ id }) => id);
    const reads = await this.readStates(viewer, ids);
    const tags = await this.topicTags(ids);
    return {
      items: rows.map((row) =>
        this.toSummary(
          row,
          viewer.subjectId ? (reads.get(row.id) ?? 0) : null,
          tags.get(row.id) ?? [],
        ),
      ),
      total,
      page: safePage,
      limit: take,
    };
  }

  /**
   * Topics related to one the viewer can read: shared tag slugs (2 points
   * each) plus the same section (1 point); only live topics in forums the
   * viewer can see. Ties go to the most recent activity.
   */
  async similarTopics(
    viewerId: string | null,
    topicId: string,
    limit: number,
  ): Promise<ForumTopicSummary[]> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const { topic } = await this.visibleTopic(topicId, viewer);
    const forumIds = await this.visibleForumIds(viewer);
    if (forumIds.length === 0) return [];
    const take = Math.min(Math.max(1, Math.trunc(limit) || 1), 10);
    const ranked = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH source_tags AS (
        SELECT g."slug" FROM "forum_topic_tags" tt
        JOIN "forum_tags" g ON g."id" = tt."tagId"
        WHERE tt."topicId" = ${topic.id}
      ),
      scored AS (
        SELECT t."id", t."lastPostAt",
          2 * (
            SELECT COUNT(DISTINCT g."slug")::int FROM "forum_topic_tags" tt
            JOIN "forum_tags" g ON g."id" = tt."tagId"
            WHERE tt."topicId" = t."id"
              AND g."slug" IN (SELECT "slug" FROM source_tags)
          ) + CASE WHEN t."forumId" = ${topic.forumId} THEN 1 ELSE 0 END AS score
        FROM "forum_topics" t
        WHERE t."id" <> ${topic.id}
          AND t."forumId" IN (${Prisma.join(forumIds)})
          AND t."mergedIntoTopicId" IS NULL
          AND t."state"::text IN ('OPEN', 'CLOSED', 'ARCHIVED')
      )
      SELECT "id" FROM scored WHERE score > 0
      ORDER BY score DESC, "lastPostAt" DESC, "id" DESC
      LIMIT ${take}
    `);
    if (ranked.length === 0) return [];
    const ids = ranked.map(({ id }) => id);
    const [rows, reads, tags] = await Promise.all([
      this.prisma.forumTopic.findMany({ where: { id: { in: ids } } }),
      this.readStates(viewer, ids),
      this.topicTags(ids),
    ]);
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row
        ? [
            this.toSummary(
              row,
              viewer.subjectId ? (reads.get(id) ?? 0) : null,
              tags.get(id) ?? [],
            ),
          ]
        : [];
    });
  }

  /** Totals over the forums the viewer can see; trashed/merged never count. */
  async hubStats(viewerId: string | null): Promise<{
    forumCount: number;
    topicCount: number;
    postCount: number;
    participantCount: number;
  }> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const forumIds = await this.visibleForumIds(viewer);
    if (forumIds.length === 0) {
      return {
        forumCount: 0,
        topicCount: 0,
        postCount: 0,
        participantCount: 0,
      };
    }
    const [row] = await this.prisma.$queryRaw<
      Array<{ topics: bigint; posts: bigint; participants: bigint }>
    >`
      SELECT
        (SELECT COUNT(*) FROM "forum_topics" t
          WHERE t."forumId" IN (${Prisma.join(forumIds)})
            AND t."mergedIntoTopicId" IS NULL
            AND t."state"::text IN ('OPEN', 'CLOSED', 'ARCHIVED'))::bigint AS "topics",
        (SELECT COUNT(*) FROM "forum_posts" p JOIN "forum_topics" t ON t."id" = p."topicId"
          WHERE t."forumId" IN (${Prisma.join(forumIds)})
            AND t."mergedIntoTopicId" IS NULL
            AND t."state"::text IN ('OPEN', 'CLOSED', 'ARCHIVED')
            AND p."state" = 'VISIBLE')::bigint AS "posts",
        (SELECT COUNT(DISTINCT p."authorId") FROM "forum_posts" p JOIN "forum_topics" t ON t."id" = p."topicId"
          WHERE t."forumId" IN (${Prisma.join(forumIds)})
            AND t."mergedIntoTopicId" IS NULL
            AND t."state"::text IN ('OPEN', 'CLOSED', 'ARCHIVED')
            AND p."state" = 'VISIBLE')::bigint AS "participants"`;
    return {
      forumCount: forumIds.length,
      topicCount: Number(row?.topics ?? 0),
      postCount: Number(row?.posts ?? 0),
      participantCount: Number(row?.participants ?? 0),
    };
  }

  /**
   * Most used active tags over visible forums, merged by slug (each forum
   * curates its own tags, so one slug may exist in several forums).
   */
  async popularTags(
    viewerId: string | null,
    limit: number,
  ): Promise<Array<{ slug: string; label: string; topicCount: number }>> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const forumIds = await this.visibleForumIds(viewer);
    if (forumIds.length === 0) return [];
    const take = Math.min(50, Math.max(1, Math.trunc(limit) || 10));
    const rows = await this.prisma.$queryRaw<
      Array<{ slug: string; label: string; topics: bigint }>
    >`
      SELECT g."slug", MIN(g."label") AS "label", COUNT(DISTINCT tt."topicId")::bigint AS "topics"
      FROM "forum_tags" g
      JOIN "forum_topic_tags" tt ON tt."tagId" = g."id"
      JOIN "forum_topics" t ON t."id" = tt."topicId"
      WHERE g."forumId" IN (${Prisma.join(forumIds)})
        AND g."active"
        AND t."mergedIntoTopicId" IS NULL
        AND t."state"::text IN ('OPEN', 'CLOSED', 'ARCHIVED')
      GROUP BY g."slug"
      ORDER BY "topics" DESC, g."slug" ASC
      LIMIT ${take}`;
    return rows.map((row) => ({
      slug: row.slug,
      label: row.label,
      topicCount: Number(row.topics),
    }));
  }

  /**
   * Counts for one section's filter panel: by type and status among live
   * (open and closed) topics, archived topics, the viewer's own topics and
   * the number of distinct members with a visible post in a live topic.
   */
  async facets(
    viewerId: string | null,
    forumId: string,
  ): Promise<ForumTopicFacets> {
    const viewer = await this.viewers.read(viewerId, new Date());
    await this.visibleForum(forumId, viewer);
    const live: Prisma.ForumTopicWhereInput = {
      forumId,
      mergedIntoTopicId: null,
      state: { in: ['OPEN', 'CLOSED'] },
    };
    const count = (where: Prisma.ForumTopicWhereInput) =>
      this.prisma.forumTopic.count({ where: { ...live, ...where } });
    const [
      total,
      questions,
      accepted,
      unsolved,
      noReplies,
      closed,
      archived,
      mine,
      participants,
    ] = await Promise.all([
      count({}),
      count({ kind: 'QUESTION' }),
      count({ acceptedAnswerPostId: { not: null } }),
      count({ kind: 'QUESTION', acceptedAnswerPostId: null }),
      count({ postCount: 1 }),
      count({ state: 'CLOSED' }),
      this.prisma.forumTopic.count({
        where: { forumId, mergedIntoTopicId: null, state: 'ARCHIVED' },
      }),
      viewer.subjectId ? count({ authorId: viewer.subjectId }) : null,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT p."authorId") AS "count"
        FROM "forum_posts" p
        JOIN "forum_topics" t ON t."id" = p."topicId"
        WHERE t."forumId" = ${forumId}
          AND t."mergedIntoTopicId" IS NULL
          AND t."state"::text IN ('OPEN', 'CLOSED')
          AND p."state"::text = 'VISIBLE'`,
    ]);
    return {
      total,
      questions,
      discussions: total - questions,
      accepted,
      unsolved,
      noReplies,
      closed,
      archived,
      mine,
      participants: Number(participants[0]?.count ?? 0),
    };
  }

  /** Throws NOT_FOUND unless the viewer may see the section. */
  async assertVisibleForum(viewerId: string, forumId: string): Promise<void> {
    const viewer = await this.authenticated(viewerId);
    await this.visibleForum(forumId, viewer);
  }

  /**
   * The signed-in viewer's own or followed topics across every forum they can
   * see right now; trashed and merged topics are excluded.
   */
  async viewerTopics(
    viewerId: string,
    collection: ForumViewerCollection,
    page: number,
    limit: number,
  ): Promise<ForumPage<ForumTopicSummary>> {
    const viewer = await this.authenticated(viewerId);
    const { skip, take, safePage } = this.paging(page, limit);
    const forumIds = await this.visibleForumIds(viewer);
    const where: Prisma.ForumTopicWhereInput = {
      forumId: { in: forumIds },
      mergedIntoTopicId: null,
      state: { in: ['OPEN', 'CLOSED', 'ARCHIVED'] },
      ...(collection === 'AUTHORED'
        ? { authorId: viewerId }
        : collection === 'SUBSCRIBED'
          ? { subscriptions: { some: { userId: viewerId } } }
          : {
              state: { in: ['OPEN', 'CLOSED'] },
              forum: { followers: { some: { userId: viewerId } } },
            }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.forumTopic.findMany({
        where,
        orderBy: [
          collection === 'FOLLOWED_SECTIONS'
            ? { createdAt: 'desc' }
            : { lastPostAt: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take,
      }),
      this.prisma.forumTopic.count({ where }),
    ]);
    const ids = rows.map(({ id }) => id);
    const reads = await this.readStates(viewer, ids);
    const tags = await this.topicTags(ids);
    return {
      items: rows.map((row) =>
        this.toSummary(row, reads.get(row.id) ?? 0, tags.get(row.id) ?? []),
      ),
      total,
      page: safePage,
      limit: take,
    };
  }

  private filterWhere(
    filter: ForumTopicFilter,
    viewerId: string | null,
  ): Prisma.ForumTopicWhereInput {
    if (filter === 'MINE') return { authorId: viewerId ?? '' };
    if (filter === 'NO_REPLIES') return { postCount: 1 };
    if (filter === 'UNSOLVED')
      return { kind: 'QUESTION', acceptedAnswerPostId: null };
    return {};
  }

  /** Forums whose category the viewer can see (same rules as browsing). */
  private async visibleForumIds(viewer: ForumViewerFacts): Promise<string[]> {
    const forums = await this.prisma.forum.findMany({
      select: {
        id: true,
        parentId: true,
        categoryId: true,
        active: true,
        parent: { select: { active: true } },
        category: {
          select: {
            active: true,
            visibility: true,
            audience: { select: { subjectKey: true } },
          },
        },
      },
    });
    const grants = await this.access.grants(viewer, forums);
    return forums
      .filter(
        (forum) =>
          grants.get(forum.id)?.read === true &&
          (viewer.seesAllCategories ||
            (forum.active &&
              forum.category.active &&
              (forum.parent?.active ?? true))) &&
          canSeeCategory(
            {
              visibility: forum.category.visibility,
              audienceKeys: forum.category.audience.map(
                ({ subjectKey }) => subjectKey,
              ),
            },
            viewer,
          ),
      )
      .map(({ id }) => id);
  }

  async topic(
    viewerId: string | null,
    topicId: string,
  ): Promise<ForumTopicSummary> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const { topic } = await this.visibleTopic(topicId, viewer);
    const reads = await this.readStates(viewer, [topic.id]);
    const tags = await this.topicTags([topic.id]);
    return this.toSummary(
      topic,
      viewer.subjectId ? (reads.get(topic.id) ?? 0) : null,
      tags.get(topic.id) ?? [],
    );
  }

  async posts(
    viewerId: string | null,
    topicId: string,
    page: number,
    limit: number,
    sort: ForumReplySort = 'OLDEST',
  ): Promise<ForumPage<ForumPostView>> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const { topic, categoryId, forum } = await this.visibleTopic(
      topicId,
      viewer,
    );
    const staff =
      viewer.subjectId !== null &&
      (topic.curatorId === viewer.subjectId ||
        (await this.isModerator(viewer, categoryId, forum)));
    const { skip, take, safePage } = this.paging(page, limit);
    const [rows, total] = await Promise.all([
      this.postPage(topicId, sort, safePage, skip, take),
      this.prisma.forumPost.count({ where: { topicId } }),
    ]);
    const notes = await this.staffNotes(rows.map(({ id }) => id));
    const items = await Promise.all(
      rows.map(async (row) =>
        this.redact(
          this.postView(row, staff, notes.get(row.id) ?? []),
          // Below the section's hidden-content floor, hidden blocks stay
          // locked as for a guest (staff always see them).
          staff || atLeastRole(viewerRole(viewer), forum.gateViewRole)
            ? viewer.subjectId
            : null,
        ),
      ),
    );
    return {
      items,
      total,
      page: safePage,
      limit: take,
    };
  }

  /**
   * One page of posts. Non-chronological sorts keep the first post at the
   * top of page 1 and order only the replies, so a page still holds
   * `take` posts and the total stays the topic post count.
   */
  private async postPage(
    topicId: string,
    sort: ForumReplySort,
    page: number,
    skip: number,
    take: number,
  ): Promise<ForumPost[]> {
    if (sort === 'OLDEST') {
      return this.prisma.forumPost.findMany({
        where: { topicId },
        orderBy: { number: 'asc' },
        skip,
        take,
      });
    }
    const first =
      page === 1
        ? await this.prisma.forumPost.findMany({
            where: { topicId, number: 1 },
          })
        : [];
    const replySkip = page === 1 ? 0 : skip - 1;
    const replyTake = page === 1 ? take - 1 : take;
    if (replyTake <= 0) return first;
    if (sort === 'NEWEST') {
      const replies = await this.prisma.forumPost.findMany({
        where: { topicId, number: { gt: 1 } },
        orderBy: { number: 'desc' },
        skip: replySkip,
        take: replyTake,
      });
      return [...first, ...replies];
    }
    const ids = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT "id" FROM "forum_posts"
      WHERE "topicId" = ${topicId} AND "number" > 1
      ORDER BY ("ratingUp" - "ratingDown") DESC, "number" ASC
      OFFSET ${replySkip} LIMIT ${replyTake}
    `);
    const replies = await this.prisma.forumPost.findMany({
      where: { id: { in: ids.map(({ id }) => id) } },
    });
    const byId = new Map(replies.map((row) => [row.id, row]));
    return [
      ...first,
      ...ids.flatMap(({ id }) => (byId.has(id) ? [byId.get(id)!] : [])),
    ];
  }

  async revisions(
    viewerId: string | null,
    postId: string,
  ): Promise<Array<{ revision: number; editorId: string; createdAt: Date }>> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { topicId: true, state: true },
    });
    if (!post || post.state !== 'VISIBLE') this.notFound('Post');
    await this.visibleTopic(post.topicId, viewer);
    return this.prisma.forumPostRevision.findMany({
      where: { postId },
      orderBy: { revision: 'asc' },
      select: { revision: true, editorId: true, createdAt: true },
    });
  }

  /** Owner policy for the `forum.topic` Interaction Target kind. */
  async permits(
    topicId: string,
    targetId: string,
    viewerId: string | null,
    capability: 'READ' | 'COMMENT' | 'REACT' | 'BOOKMARK' | 'SHARE',
  ): Promise<boolean> {
    if (capability === 'COMMENT') return false; // Forum replies are posts.
    const viewer = await this.viewers.read(viewerId, new Date());
    let visible: VisibleTopic;
    try {
      visible = await this.visibleTopic(topicId, viewer);
    } catch (error) {
      if (error instanceof ForumCommandError) return false;
      throw error;
    }
    if (visible.topic.interactionTargetId !== targetId) return false;
    if (capability === 'READ' || capability === 'SHARE') return true;
    if (viewer.subjectId === null) return false;
    return capability === 'BOOKMARK' || visible.topic.state === 'OPEN';
  }

  private async transition(
    actorId: string,
    topicId: string,
    to: 'OPEN' | 'CLOSED',
  ): Promise<ForumTopicSummary> {
    const viewer = await this.authenticated(actorId);
    const { topic, categoryId } = await this.visibleTopic(topicId, viewer);
    const actor = {
      id: actorId,
      moderator: await this.structure.canModerateCategory(actorId, categoryId),
    };
    const allowed =
      to === 'CLOSED'
        ? canCloseTopic(topic, actor)
        : canReopenTopic(topic, actor);
    if (!allowed) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        to === 'CLOSED'
          ? 'You cannot close this topic.'
          : 'Only curators and moderators can reopen a topic.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.forumTopic.updateMany({
        where: { id: topicId, state: to === 'CLOSED' ? 'OPEN' : 'CLOSED' },
        data: { state: to },
      });
      if (updated.count !== 1) {
        throw new ForumCommandError('CONFLICT', 'The topic state changed.');
      }
      await this.record(
        tx,
        actorId,
        'ForumTopic',
        topicId,
        to === 'CLOSED' ? 'topic.closed' : 'topic.reopened',
        { byModerator: actor.moderator && actorId !== topic.authorId },
      );
    });
    return this.summary(topicId);
  }

  private async visibleForum(forumId: string, viewer: ForumViewerFacts) {
    const forum = await this.prisma.forum.findUnique({
      where: { id: forumId },
      include: {
        category: { include: { audience: { select: { subjectKey: true } } } },
      },
    });
    if (
      !forum ||
      (!viewer.seesAllCategories &&
        (!forum.active || !forum.category.active)) ||
      !canSeeCategory(
        {
          visibility: forum.category.visibility,
          audienceKeys: forum.category.audience.map(
            ({ subjectKey }) => subjectKey,
          ),
        },
        viewer,
      )
    ) {
      this.notFound('Forum');
    }
    if (forum.parentId && !viewer.seesAllCategories) {
      const parent = await this.prisma.forum.findUnique({
        where: { id: forum.parentId },
        select: { active: true },
      });
      if (!parent?.active) this.notFound('Forum');
    }
    const grant = await this.access.grant(viewer, forum);
    if (!grant.view) this.notFound('Forum');
    return Object.assign(forum, { grant });
  }

  /** Hidden blocks: who may add them in this section and with which kinds. */
  private requireGateRules(
    viewer: ForumViewerFacts,
    forum: { gateCreateRole: ForumAccessRole; gateBlockTypes: string[] },
    document: unknown,
  ): void {
    if (!this.contains(document, (type) => type === GATE_NODE)) return;
    const staff = viewer.seesAllCategories || viewer.moderatesAllCategories;
    if (!staff && !atLeastRole(viewerRole(viewer), forum.gateCreateRole)) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        'Your role cannot add hidden blocks in this section.',
      );
    }
    const allowed = new Set(forum.gateBlockTypes);
    for (const kind of gateBlockKinds(document, GATE_NODE)) {
      if (!allowed.has(kind)) {
        throw new ForumCommandError(
          'INVALID_INPUT',
          'Hidden blocks in this section cannot contain this kind of content.',
        );
      }
    }
  }

  /** Newly attached files must fit the section's size and format limits. */
  private async requireAttachmentLimits(
    actorId: string,
    forum: { attachmentMaxMb: number | null; attachmentFormats: string[] },
    mediaIds: readonly string[],
    alreadyReferenced: readonly string[],
  ): Promise<void> {
    if (!this.media?.files) return;
    if (
      forum.attachmentMaxMb === null &&
      forum.attachmentFormats.length === 0
    ) {
      return;
    }
    const known = new Set(alreadyReferenced);
    const added = mediaIds.filter((id) => !known.has(id));
    if (added.length === 0) return;
    const files = await this.media.files(actorId, added);
    const maxBytes =
      forum.attachmentMaxMb === null
        ? null
        : forum.attachmentMaxMb * 1024 * 1024;
    for (const file of files) {
      if (maxBytes !== null && file.size > maxBytes) {
        throw new ForumCommandError(
          'INVALID_INPUT',
          `Files in this section may be at most ${forum.attachmentMaxMb} MB.`,
        );
      }
      if (
        forum.attachmentFormats.length > 0 &&
        !forum.attachmentFormats.includes(file.extension)
      ) {
        throw new ForumCommandError(
          'INVALID_INPUT',
          'This file format is not allowed in this section.',
        );
      }
    }
  }

  private requireAttachmentsAllowed(
    forum: { allowAttachments: boolean },
    mediaIds: readonly string[],
  ): void {
    if (mediaIds.length > 0 && !forum.allowAttachments) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        'Attachments are turned off in this section.',
      );
    }
  }

  /** Resolves a topic the viewer may see; trashed topics only for moderators. */
  async visibleTopic(
    topicId: string,
    viewer: ForumViewerFacts,
  ): Promise<VisibleTopic> {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id: topicId },
    });
    if (!topic) this.notFound('Topic');
    const forum = await this.visibleForum(topic.forumId, viewer).catch(
      (error: unknown) => {
        if (error instanceof ForumCommandError) this.notFound('Topic');
        throw error;
      },
    );
    if (!forum.grant.read) this.notFound('Topic');
    const scope: SectionScope = {
      id: forum.id,
      parentId: forum.parentId,
      allowTopics: forum.allowTopics,
      allowReplies: forum.allowReplies,
      allowPolls: forum.allowPolls,
      allowAttachments: forum.allowAttachments,
      pinnedLimit: forum.pinnedLimit,
      attachmentMaxMb: forum.attachmentMaxMb,
      attachmentFormats: forum.attachmentFormats,
      gateViewRole: forum.gateViewRole,
      gateCreateRole: forum.gateCreateRole,
      gateBlockTypes: forum.gateBlockTypes,
      grant: forum.grant,
    };
    if (
      topic.state === 'TRASHED' &&
      !(await this.isModerator(viewer, forum.categoryId, scope))
    ) {
      this.notFound('Topic');
    }
    return {
      topic,
      categoryId: forum.categoryId,
      allowsGatedContent: forum.allowsGatedContent,
      viewer,
      forum: scope,
    };
  }

  /** Category moderator, supermoderator or structure manager. */
  async isModerator(
    viewer: ForumViewerFacts,
    categoryId: string,
    forum?: { id: string; parentId: string | null; grant?: ForumAccessGrant },
  ): Promise<boolean> {
    if (viewer.subjectId === null) return false;
    if (viewer.seesAllCategories || viewer.moderatesAllCategories) return true;
    if (forum?.grant?.moderate) return true;
    if (
      await this.structure.canModerateCategory(viewer.subjectId, categoryId)
    ) {
      return true;
    }
    if (!forum) return false;
    return this.structure.canModerateForum(
      viewer.subjectId,
      [forum.id, forum.parentId].filter((id): id is string => id !== null),
    );
  }

  private async authenticated(actorId: string): Promise<ForumViewerFacts> {
    const viewer = await this.viewers.read(actorId, new Date());
    if (viewer.subjectId === null) {
      throw new ForumCommandError('ACCESS_DENIED', 'Sign in to post.');
    }
    return viewer;
  }

  private async cooldownExempt(
    viewer: ForumViewerFacts,
    categoryId: string,
  ): Promise<boolean> {
    if (viewer.moderatesAllCategories || viewer.seesAllCategories) return true;
    return this.structure.canModerateCategory(viewer.subjectId!, categoryId);
  }

  private async cooldown(
    tx: TransactionClient,
    userId: string,
    now: Date,
    exempt: boolean,
  ): Promise<void> {
    if (exempt) return;
    const threshold = new Date(
      now.getTime() - FORUM_POSTING_COOLDOWN_SECONDS * 1000,
    );
    const rows = await tx.$queryRaw<Array<{ userId: string }>>`
      INSERT INTO "forum_posting_cooldowns" ("userId", "lastPostAt")
      VALUES (${userId}, ${now})
      ON CONFLICT ("userId") DO UPDATE SET "lastPostAt" = EXCLUDED."lastPostAt"
      WHERE "forum_posting_cooldowns"."lastPostAt" <= ${threshold}
      RETURNING "userId"`;
    if (rows.length !== 1) {
      throw new ForumCommandError(
        'RATE_LIMITED',
        `Please wait ${FORUM_POSTING_COOLDOWN_SECONDS} seconds between posts.`,
      );
    }
  }

  /** Media IDs of a validated document; new ones must be attachable by the actor. */
  private async attachableMedia(
    actorId: string,
    document: unknown,
    alreadyReferenced: readonly string[],
  ): Promise<string[]> {
    if (!this.media) return [];
    const ids = collectEditorMediaIds(
      document as Parameters<typeof collectEditorMediaIds>[0],
    );
    const known = new Set(alreadyReferenced);
    const added = ids.filter((id) => !known.has(id));
    if (added.length) {
      const rejected = await this.media.rejectedForActor(actorId, added);
      if (rejected.length) {
        throw new ForumCommandError(
          'INVALID_INPUT',
          'Some files are unavailable: they must be ready and yours or public.',
        );
      }
    }
    return ids;
  }

  private async syncMedia(
    tx: TransactionClient,
    postId: string,
    actorId: string,
    mediaIds: readonly string[],
    always = false,
  ): Promise<void> {
    if (!this.media || (!always && mediaIds.length === 0)) return;
    await this.media.sync(tx, postId, actorId, mediaIds);
  }

  private content(
    documentJson: string,
    profile: 'topic' | 'reply',
    allowsGatedContent: boolean,
  ): ValidatedEditorDocument {
    const content =
      profile === 'topic'
        ? this.editor.normalizeForumTopic(documentJson)
        : this.editor.normalizeForumReply(documentJson);
    if (
      !this.media &&
      this.contains(content.document, (type) => MEDIA_NODES.has(type))
    ) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        'Media and attachments in forum posts are not available yet.',
      );
    }
    if (
      !allowsGatedContent &&
      this.contains(content.document, (type) => type === GATE_NODE)
    ) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        'Hidden content is allowed only in forums enabled for it.',
      );
    }
    if (!content.plainText.trim()) {
      throw new ForumCommandError('INVALID_INPUT', 'A post cannot be empty.');
    }
    return content;
  }

  private contains(node: unknown, match: (type: string) => boolean): boolean {
    if (!node || typeof node !== 'object') return false;
    const record = node as { type?: unknown; content?: unknown };
    if (typeof record.type === 'string' && match(record.type)) return true;
    // An EditorDocument wraps its root node in `content` (an object); nodes
    // keep their children in a `content` array.
    if (Array.isArray(record.content)) {
      return record.content.some((child) => this.contains(child, match));
    }
    return this.contains(record.content, match);
  }

  /** Authors and editors must be able to read every hidden block they save. */
  private async requireDocumentAccess(
    actorId: string,
    document: unknown,
  ): Promise<void> {
    if (!this.contains(document, (type) => type === GATE_NODE)) return;
    const view = await this.gateAccess.project(
      JSON.stringify(document),
      actorId,
    );
    if (view.gates.some((gate) => !gate.allowed)) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        'Full access to every hidden block is required to save this post.',
      );
    }
  }

  /** Server-side Content Gate redaction for the current viewer. */
  private async redact(
    view: ForumPostView,
    viewerId: string | null,
  ): Promise<ForumPostView> {
    if (
      view.documentJson === null ||
      !view.documentJson.includes('"' + GATE_NODE + '"')
    ) {
      return view;
    }
    const projected = await this.projector.project(view.documentJson, viewerId);
    return { ...view, documentJson: projected.documentJson };
  }

  private async insertPost(
    tx: TransactionClient,
    input: {
      id: string;
      topicId: string;
      number: number;
      authorId: string;
      content: ValidatedEditorDocument;
      replyToNumber: number | null;
      quotedNumbers: number[];
      createdAt: Date;
    },
  ): Promise<void> {
    const document = input.content.document as unknown as Prisma.InputJsonValue;
    await tx.forumPost.create({
      data: {
        id: input.id,
        topicId: input.topicId,
        number: input.number,
        authorId: input.authorId,
        document,
        plainText: input.content.plainText,
        searchText: input.content.searchText,
        replyToNumber: input.replyToNumber,
        quotedNumbers: input.quotedNumbers,
        createdAt: input.createdAt,
      },
    });
    await tx.forumPostRevision.create({
      data: {
        postId: input.id,
        revision: 1,
        document,
        plainText: input.content.plainText,
        editorId: input.authorId,
        createdAt: input.createdAt,
      },
    });
  }

  private async summary(topicId: string): Promise<ForumTopicSummary> {
    return this.toSummary(
      await this.prisma.forumTopic.findUniqueOrThrow({
        where: { id: topicId },
      }),
    );
  }

  /** Pinned first, then the hot score or the net rating, newest on ties. */
  private async rankedTopics(
    forumId: string,
    states: ForumTopicState[],
    since: Date | null,
    tagSlug: string | null,
    sort: 'HOT' | 'TOP',
    skip: number,
    take: number,
    filter: ForumTopicFilter = 'ALL',
    viewerId: string | null = null,
    kind: ForumTopicKind | null = null,
  ): Promise<ForumTopic[]> {
    const kindSql = kind
      ? Prisma.sql`AND "kind"::text = ${kind}`
      : Prisma.empty;
    const filterSql =
      filter === 'MINE'
        ? Prisma.sql`AND "authorId" = ${viewerId}`
        : filter === 'NO_REPLIES'
          ? Prisma.sql`AND "postCount" = 1`
          : filter === 'UNSOLVED'
            ? Prisma.sql`AND "kind"::text = 'QUESTION' AND "acceptedAnswerPostId" IS NULL`
            : Prisma.empty;
    const settings = await this.prisma.forumRankingSettings.findUnique({
      where: { id: 'default' },
    });
    const gravity =
      settings?.hotGravitySeconds ?? DEFAULT_FORUM_RANKING.hotGravitySeconds;
    const replyWeight =
      settings?.hotReplyWeight ?? DEFAULT_FORUM_RANKING.hotReplyWeight;
    const order =
      sort === 'HOT'
        ? Prisma.sql`SIGN("ratingUp" - "ratingDown") * LOG(GREATEST(ABS("ratingUp" - "ratingDown"), 1))
            + ${replyWeight} * LOG(GREATEST("postCount", 1))
            + EXTRACT(EPOCH FROM "createdAt") / ${gravity}`
        : Prisma.sql`("ratingUp" - "ratingDown")`;
    const ranked = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "forum_topics"
      WHERE "forumId" = ${forumId}
        AND "mergedIntoTopicId" IS NULL
        AND "state"::text IN (${Prisma.join(states)})
        AND (${since}::timestamp IS NULL OR "createdAt" >= ${since})
        AND (${tagSlug}::text IS NULL OR EXISTS (
          SELECT 1 FROM "forum_topic_tags" tt
          JOIN "forum_tags" g ON g."id" = tt."tagId"
          WHERE tt."topicId" = "forum_topics"."id" AND g."slug" = ${tagSlug}
        ))
        ${filterSql}
        ${kindSql}
      ORDER BY "pinned" DESC, ${order} DESC, "createdAt" DESC, "id" DESC
      LIMIT ${take} OFFSET ${skip}`;
    const rows = await this.prisma.forumTopic.findMany({
      where: { id: { in: ranked.map(({ id }) => id) } },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ranked.map(({ id }) => byId.get(id)!).filter(Boolean);
  }

  private async readStates(
    viewer: ForumViewerFacts,
    topicIds: string[],
  ): Promise<Map<string, number>> {
    if (viewer.subjectId === null || topicIds.length === 0) return new Map();
    const rows = await this.prisma.forumTopicReadState.findMany({
      where: { userId: viewer.subjectId, topicId: { in: topicIds } },
      select: { topicId: true, lastReadNumber: true },
    });
    return new Map(rows.map((row) => [row.topicId, row.lastReadNumber]));
  }

  /** Public form of the forum visibility check for sibling Forum services. */
  visibleForumFor(forumId: string, viewer: ForumViewerFacts) {
    return this.visibleForum(forumId, viewer);
  }

  private async topicTags(
    topicIds: string[],
  ): Promise<Map<string, ForumTopicSummary['tags']>> {
    if (topicIds.length === 0) return new Map();
    const rows = await this.prisma.forumTopicTag.findMany({
      where: { topicId: { in: topicIds }, tag: { active: true } },
      select: {
        topicId: true,
        tag: { select: { id: true, slug: true, label: true } },
      },
      orderBy: { tag: { label: 'asc' } },
    });
    const map = new Map<string, ForumTopicSummary['tags']>();
    for (const row of rows) {
      map.set(row.topicId, [...(map.get(row.topicId) ?? []), row.tag]);
    }
    return map;
  }

  private toSummary(
    row: ForumTopic,
    lastRead?: number | null,
    tags: ForumTopicSummary['tags'] = [],
  ): ForumTopicSummary {
    return {
      id: row.id,
      forumId: row.forumId,
      interactionTargetId: row.interactionTargetId,
      authorId: row.authorId,
      kind: row.kind,
      title: row.title,
      state: row.state,
      pinned: row.pinned,
      curatorId: row.curatorId,
      postCount: row.postCount,
      lastPostNumber: row.lastPostNumber,
      lastPostAt: row.lastPostAt,
      lastPostAuthorId: row.lastPostAuthorId,
      ratingUp: row.ratingUp,
      ratingDown: row.ratingDown,
      viewCount: row.viewCount,
      viewerLastReadNumber: lastRead ?? null,
      acceptedAnswerPostId: row.acceptedAnswerPostId,
      mergedIntoTopicId: row.mergedIntoTopicId,
      tags,
      createdAt: row.createdAt,
    };
  }

  private postView(
    row: ForumPost,
    staff: boolean,
    staffNotes: ForumStaffNoteView[],
  ): ForumPostView {
    const showContent =
      row.state === 'VISIBLE' ||
      (staff && (row.state === 'HIDDEN' || row.state === 'DELETED'));
    return {
      id: row.id,
      topicId: row.topicId,
      number: row.number,
      authorId: row.authorId,
      state: row.state,
      documentJson: showContent ? JSON.stringify(row.document) : null,
      replyToNumber: row.replyToNumber,
      quotedNumbers: row.quotedNumbers,
      revision: row.revision,
      ratingUp: row.ratingUp,
      ratingDown: row.ratingDown,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      moderation:
        staff && row.moderatedAt && row.moderatedById && row.moderationReason
          ? {
              at: row.moderatedAt,
              byId: row.moderatedById,
              reason: row.moderationReason,
            }
          : null,
      staffNotes,
    };
  }

  private async staffNotes(
    postIds: string[],
  ): Promise<Map<string, ForumStaffNoteView[]>> {
    const notes = postIds.length
      ? await this.prisma.forumPostStaffNote.findMany({
          where: { postId: { in: postIds }, removedAt: null },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        })
      : [];
    const grouped = new Map<string, ForumStaffNoteView[]>();
    for (const note of notes) {
      const list = grouped.get(note.postId) ?? [];
      list.push({
        id: note.id,
        authorId: note.authorId,
        role: note.role,
        body: note.body,
        createdAt: note.createdAt,
      });
      grouped.set(note.postId, list);
    }
    return grouped;
  }

  private paging(page: number, limit: number) {
    const safePage = Math.max(1, Math.trunc(page) || 1);
    const take = Math.min(MAX_PAGE, Math.max(1, Math.trunc(limit) || 20));
    return { skip: (safePage - 1) * take, take, safePage };
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    targetType: 'ForumTopic' | 'ForumPost',
    targetId: string,
    action: string,
    metadata: Record<string, string | number | boolean | null>,
  ): Promise<void> {
    await this.audit.append(tx, {
      action: 'forum.' + action.replaceAll('.', '_'),
      actorType: 'USER',
      actorId,
      targetType,
      targetId,
      metadata,
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: 'forum.' + action + '.v1',
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId,
        aggregate: { type: targetType, id: targetId },
        payload: { targetId, ...metadata },
      }),
    );
  }

  private notFound(target: string): never {
    throw new ForumCommandError('NOT_FOUND', target + ' was not found.');
  }
}

/** 💬 A forum is a promise that every reply will find its place in line. */
