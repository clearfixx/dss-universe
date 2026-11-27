/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-moderation.ts
 *
 * 🎯 Purpose:
 * Implements CH-1b: hide/delete/restore posts, archive/trash/restore topics,
 * pinning, staff notes and administrator purge.
 *
 * ⚠️ Important:
 * Every action is scope-checked, compare-and-swap on state, and recorded with
 * audit and Outbox evidence. Purge erases content from the post and all its
 * revisions inside a transaction that explicitly declares the purge.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable, Inject, Optional } from '@nestjs/common';
import { FORUM_POST_MEDIA, type ForumPostMedia } from './forum-post-media.port';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  FORUM_VIEWER_FACTS,
  type ForumViewerFactsReader,
} from '../contracts/forum-viewer-facts.contract';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import {
  canModeratePost,
  normalizeModerationReason,
  normalizeStaffNote,
  staffNoteRole,
  staffRole,
  TOPIC_MODERATION_TRANSITIONS,
  type ForumModerationActor,
} from '../domain/forum-moderation.rules';
import type { ForumViewerFacts } from '../domain/types/forum-structure.type';
import type {
  ForumStaffNoteView,
  ForumStaffRole,
  ForumTopicState,
  ForumTopicSummary,
} from '../domain/types/forum-topic.type';
import { ForumTopicsService } from './prisma-forum-topics';

const PRODUCER = 'dss.api.forum';
type TopicAction = keyof typeof TOPIC_MODERATION_TRANSITIONS;
const TOPIC_EVENTS: Readonly<Record<TopicAction, string>> = {
  ARCHIVE: 'topic.archived',
  UNARCHIVE: 'topic.unarchived',
  TRASH: 'topic.trashed',
  RESTORE: 'topic.restored',
};

@Injectable()
export class ForumModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    @Inject(FORUM_VIEWER_FACTS)
    private readonly viewers: ForumViewerFactsReader,
    private readonly topics: ForumTopicsService,
    @Optional()
    @Inject(FORUM_POST_MEDIA)
    private readonly media?: ForumPostMedia,
  ) {}

  hidePost(actorId: string, postId: string, reason: string) {
    return this.movePost(actorId, postId, 'HIDDEN', reason);
  }

  /**
   * The author removes their own reply when the section matrix grants
   * "delete own". Soft delete: moderators can restore it. The first post
   * goes only with its topic (trash).
   */
  async deleteOwnPost(
    actorId: string,
    postId: string,
  ): Promise<{ postId: string; state: string }> {
    const { post, forum } = await this.postScope(actorId, postId);
    if (post.authorId !== actorId || !forum.grant.deleteOwn) this.denied();
    if (post.number === 1) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        'The first post is removed by trashing the topic.',
      );
    }
    if (post.state !== 'VISIBLE') {
      throw new ForumCommandError('CONFLICT', 'The post state changed.');
    }
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.forumPost.updateMany({
        where: { id: postId, state: 'VISIBLE', authorId: actorId },
        data: {
          state: 'DELETED',
          moderatedAt: new Date(),
          moderatedById: actorId,
          moderationReason: 'Deleted by the author.',
        },
      });
      if (updated.count !== 1) {
        throw new ForumCommandError('CONFLICT', 'The post state changed.');
      }
      await this.record(tx, actorId, 'ForumPost', postId, 'post.deleted', {
        topicId: post.topicId,
        number: post.number,
        from: 'VISIBLE',
        reason: 'Deleted by the author.',
        byAuthor: true,
      });
    });
    return { postId, state: 'DELETED' };
  }

  deletePost(actorId: string, postId: string, reason: string) {
    return this.movePost(actorId, postId, 'DELETED', reason);
  }

  restorePost(actorId: string, postId: string) {
    return this.movePost(actorId, postId, 'VISIBLE', null);
  }

  async purgePost(
    actorId: string,
    postId: string,
    reason: string,
  ): Promise<{ postId: string }> {
    const viewer = await this.viewer(actorId);
    if (!viewer.canPurgeContent) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        'Purging requires verified platform ownership.',
      );
    }
    const purgeReason = normalizeModerationReason(reason);
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true, topicId: true, number: true, state: true },
    });
    if (!post) this.notFound('Post');
    if (post.state === 'PURGED') {
      throw new ForumCommandError('CONFLICT', 'The post is already purged.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('dss.forum_purge', 'on', true)`;
      const updated = await tx.forumPost.updateMany({
        where: { id: postId, state: { not: 'PURGED' } },
        data: {
          state: 'PURGED',
          document: {},
          plainText: '',
          searchText: '',
          purgedAt: new Date(),
          purgedById: actorId,
          purgeReason,
        },
      });
      if (updated.count !== 1) {
        throw new ForumCommandError('CONFLICT', 'The post state changed.');
      }
      await tx.forumPostRevision.updateMany({
        where: { postId },
        data: { document: {}, plainText: '' },
      });
      await tx.$executeRaw`SELECT set_config('dss.forum_purge', 'off', true)`;
      // Purge is the only removal that releases the post's files; hiding and
      // deleting keep references. Files themselves stay with Media.
      await this.media?.sync(tx, postId, actorId, []);
      await this.record(tx, actorId, 'ForumPost', postId, 'post.purged', {
        topicId: post.topicId,
        number: post.number,
        reason: purgeReason,
      });
    });
    return { postId };
  }

  archiveTopic(actorId: string, topicId: string) {
    return this.moveTopic(actorId, topicId, 'ARCHIVE');
  }

  unarchiveTopic(actorId: string, topicId: string) {
    return this.moveTopic(actorId, topicId, 'UNARCHIVE');
  }

  trashTopic(actorId: string, topicId: string) {
    return this.moveTopic(actorId, topicId, 'TRASH');
  }

  restoreTopic(actorId: string, topicId: string) {
    return this.moveTopic(actorId, topicId, 'RESTORE');
  }

  async pinTopic(
    actorId: string,
    topicId: string,
    pinned: boolean,
  ): Promise<ForumTopicSummary> {
    const viewer = await this.viewer(actorId);
    const { categoryId, forum } = await this.topics.visibleTopic(
      topicId,
      viewer,
    );
    if (!(await this.topics.isModerator(viewer, categoryId, forum)))
      this.denied();
    await this.prisma.$transaction(async (tx) => {
      if (pinned && forum.pinnedLimit !== null) {
        const current = await tx.forumTopic.count({
          where: {
            forumId: forum.id,
            pinned: true,
            mergedIntoTopicId: null,
            state: { not: 'TRASHED' },
          },
        });
        if (current >= forum.pinnedLimit) {
          throw new ForumCommandError(
            'CONFLICT',
            `This section allows at most ${forum.pinnedLimit} pinned topics.`,
          );
        }
      }
      const updated = await tx.forumTopic.updateMany({
        where: { id: topicId, pinned: !pinned, state: { not: 'TRASHED' } },
        data: { pinned },
      });
      if (updated.count !== 1) {
        throw new ForumCommandError(
          'CONFLICT',
          pinned ? 'The topic is already pinned.' : 'The topic is not pinned.',
        );
      }
      await this.record(
        tx,
        actorId,
        'ForumTopic',
        topicId,
        pinned ? 'topic.pinned' : 'topic.unpinned',
        {},
      );
    });
    return this.topics.topic(actorId, topicId);
  }

  async addStaffNote(
    actorId: string,
    postId: string,
    body: string,
    requestedRole?: ForumStaffRole | null,
  ): Promise<ForumStaffNoteView> {
    const { viewer, actor, post } = await this.postScope(actorId, postId);
    const role = staffNoteRole(staffRole(viewer, actor), requestedRole);
    if (!role) this.denied();
    if (post.state === 'PURGED') this.notFound('Post');
    const text = normalizeStaffNote(body);
    const note = await this.prisma.$transaction(async (tx) => {
      const created = await tx.forumPostStaffNote.create({
        data: { postId, authorId: actorId, role, body: text },
      });
      await this.record(tx, actorId, 'ForumPost', postId, 'staff_note.added', {
        noteId: created.id,
        role,
      });
      return created;
    });
    return {
      id: note.id,
      authorId: note.authorId,
      role: note.role,
      body: note.body,
      createdAt: note.createdAt,
    };
  }

  async removeStaffNote(actorId: string, noteId: string): Promise<boolean> {
    const note = await this.prisma.forumPostStaffNote.findUnique({
      where: { id: noteId },
      select: { postId: true, authorId: true, removedAt: true },
    });
    if (!note || note.removedAt) this.notFound('Staff note');
    const { actor } = await this.postScope(actorId, note.postId);
    if (note.authorId !== actorId && !actor.moderator) this.denied();
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.forumPostStaffNote.updateMany({
        where: { id: noteId, removedAt: null },
        data: { removedAt: new Date(), removedById: actorId },
      });
      if (updated.count !== 1) this.notFound('Staff note');
      await this.record(
        tx,
        actorId,
        'ForumPost',
        note.postId,
        'staff_note.removed',
        { noteId },
      );
    });
    return true;
  }

  private async movePost(
    actorId: string,
    postId: string,
    target: 'HIDDEN' | 'DELETED' | 'VISIBLE',
    reason: string | null,
  ): Promise<{ postId: string; state: string }> {
    const { actor, post } = await this.postScope(actorId, postId);
    if (!canModeratePost(post, actor, target)) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        post.number === 1
          ? 'The first post is removed by trashing the topic.'
          : 'You cannot apply this moderation action to the post.',
      );
    }
    const normalized =
      target === 'VISIBLE' ? null : normalizeModerationReason(reason ?? '');
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.forumPost.updateMany({
        where: { id: postId, state: post.state },
        data:
          target === 'VISIBLE'
            ? {
                state: 'VISIBLE',
                moderatedAt: null,
                moderatedById: null,
                moderationReason: null,
              }
            : {
                state: target,
                moderatedAt: new Date(),
                moderatedById: actorId,
                moderationReason: normalized,
              },
      });
      if (updated.count !== 1) {
        throw new ForumCommandError('CONFLICT', 'The post state changed.');
      }
      await this.record(
        tx,
        actorId,
        'ForumPost',
        postId,
        target === 'VISIBLE'
          ? 'post.restored'
          : target === 'HIDDEN'
            ? 'post.hidden'
            : 'post.deleted',
        {
          topicId: post.topicId,
          number: post.number,
          from: post.state,
          reason: normalized,
          byCurator: actor.curator && !actor.moderator,
        },
      );
    });
    return { postId, state: target };
  }

  private async moveTopic(
    actorId: string,
    topicId: string,
    action: TopicAction,
  ): Promise<ForumTopicSummary> {
    const viewer = await this.viewer(actorId);
    const { topic, categoryId, forum } = await this.topics.visibleTopic(
      topicId,
      viewer,
    );
    if (!(await this.topics.isModerator(viewer, categoryId, forum)))
      this.denied();
    if (!TOPIC_MODERATION_TRANSITIONS[action].includes(topic.state)) {
      throw new ForumCommandError(
        'CONFLICT',
        `The topic cannot be moved by ${action.toLowerCase()} from ${topic.state}.`,
      );
    }
    const next: {
      state: ForumTopicState;
      stateBeforeTrash: ForumTopicState | null;
      trashedAt: Date | null;
      trashedById: string | null;
    } =
      action === 'TRASH'
        ? {
            state: 'TRASHED',
            stateBeforeTrash: topic.state,
            trashedAt: new Date(),
            trashedById: actorId,
          }
        : {
            state:
              action === 'ARCHIVE'
                ? 'ARCHIVED'
                : action === 'UNARCHIVE'
                  ? 'CLOSED'
                  : (topic.stateBeforeTrash ?? 'CLOSED'),
            stateBeforeTrash: null,
            trashedAt: null,
            trashedById: null,
          };
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.forumTopic.updateMany({
        where: { id: topicId, state: topic.state },
        data: next,
      });
      if (updated.count !== 1) {
        throw new ForumCommandError('CONFLICT', 'The topic state changed.');
      }
      await this.record(
        tx,
        actorId,
        'ForumTopic',
        topicId,
        TOPIC_EVENTS[action],
        { from: topic.state, to: next.state },
      );
    });
    return this.topics.topic(actorId, topicId);
  }

  private async postScope(actorId: string, postId: string) {
    const viewer = await this.viewer(actorId);
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        topicId: true,
        number: true,
        state: true,
        authorId: true,
      },
    });
    if (!post) this.notFound('Post');
    const { topic, categoryId, forum } = await this.topics.visibleTopic(
      post.topicId,
      viewer,
    );
    const actor: ForumModerationActor = {
      id: actorId,
      moderator: await this.topics.isModerator(viewer, categoryId, forum),
      curator: topic.curatorId === actorId,
    };
    return { viewer, actor, post, topic, forum };
  }

  private async viewer(actorId: string): Promise<ForumViewerFacts> {
    const viewer = await this.viewers.read(actorId, new Date());
    if (viewer.subjectId === null) this.denied();
    return viewer;
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

  private denied(): never {
    throw new ForumCommandError('ACCESS_DENIED', 'Insufficient permissions.');
  }

  private notFound(target: string): never {
    throw new ForumCommandError('NOT_FOUND', target + ' was not found.');
  }
}

/** 🗂️ Archive keeps memory, trash keeps mistakes, purge keeps the law. */
