/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-operations.ts
 *
 * 🎯 Purpose:
 * Implements CH-4: curators, moving topics between forums, moving posts,
 * merging and splitting topics, and scoped sanctions.
 *
 * ⚠️ Important:
 * • moderators act only inside categories they moderate (moves need both);
 * • relocations lock every affected topic in id order, renumber moved posts in
 *   their original order, remap reply/quote references and remember the
 *   original coordinates;
 * • sanctions go through Moderation's SANCTION_ISSUER after Forum's own scope
 *   check — Forum never writes sanctions itself.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { ForumPost } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  SANCTION_ISSUER,
  type IssuedSanctionReceipt,
  type SanctionIssuer,
} from '@api/modules/moderation';
import {
  FORUM_VIEWER_FACTS,
  type ForumViewerFactsReader,
} from '../contracts/forum-viewer-facts.contract';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import { normalizeTopicTitle } from '../domain/forum-topic.rules';
import type { ForumViewerFacts } from '../domain/types/forum-structure.type';
import type { ForumTopicSummary } from '../domain/types/forum-topic.type';
import { ForumTopicsService } from './prisma-forum-topics';

const PRODUCER = 'dss.api.forum';
const MAX_MOVED_POSTS = 200;

@Injectable()
export class ForumOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    @Inject(FORUM_VIEWER_FACTS)
    private readonly viewers: ForumViewerFactsReader,
    @Inject(SANCTION_ISSUER)
    private readonly sanctions: SanctionIssuer,
    private readonly topics: ForumTopicsService,
  ) {}

  /** Assigns, replaces (curatorId) or removes (null) the topic curator. */
  async setCurator(
    actorId: string,
    topicId: string,
    curatorId: string | null,
  ): Promise<ForumTopicSummary> {
    const viewer = await this.viewer(actorId);
    const { topic, categoryId } = await this.topics.visibleTopic(
      topicId,
      viewer,
    );
    await this.requireModerator(viewer, categoryId);
    if (curatorId) {
      const exists = await this.prisma.user.findUnique({
        where: { id: curatorId },
        select: { id: true },
      });
      if (!exists) this.notFound('User');
    }
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.forumTopic.updateMany({
        where: { id: topicId, curatorId: topic.curatorId },
        data: { curatorId },
      });
      if (updated.count !== 1)
        this.conflict('The curator changed concurrently.');
      await this.record(
        tx,
        actorId,
        'ForumTopic',
        topicId,
        curatorId ? 'curator.assigned' : 'curator.removed',
        { curatorId, previousCuratorId: topic.curatorId },
      );
    });
    return this.topics.topic(actorId, topicId);
  }

  async moveTopic(
    actorId: string,
    topicId: string,
    targetForumId: string,
  ): Promise<ForumTopicSummary> {
    const viewer = await this.viewer(actorId);
    const { topic, categoryId } = await this.topics.visibleTopic(
      topicId,
      viewer,
    );
    const target = await this.topics.visibleForumFor(targetForumId, viewer);
    await this.requireModerator(viewer, categoryId);
    await this.requireModerator(viewer, target.categoryId);
    if (topic.forumId === targetForumId)
      this.conflict('The topic is already there.');
    if (topic.mergedIntoTopicId) this.conflict('A merged topic cannot move.');
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, [topicId]);
      // Tags are curated per forum and cannot follow the topic.
      await tx.forumTopicTag.deleteMany({ where: { topicId } });
      await tx.forumTopic.update({
        where: { id: topicId },
        data: { forumId: targetForumId },
      });
      await this.record(tx, actorId, 'ForumTopic', topicId, 'topic.moved', {
        fromForumId: topic.forumId,
        toForumId: targetForumId,
      });
    });
    return this.topics.topic(actorId, topicId);
  }

  async movePosts(
    actorId: string,
    sourceTopicId: string,
    numbers: number[],
    targetTopicId: string,
  ): Promise<ForumTopicSummary> {
    const selected = this.selection(numbers);
    const { source, target } = await this.pair(
      actorId,
      sourceTopicId,
      targetTopicId,
    );
    if (target.mergedIntoTopicId || source.mergedIntoTopicId) {
      this.conflict('Merged topics cannot exchange posts.');
    }
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, [sourceTopicId, targetTopicId]);
      const posts = await this.loadPosts(tx, sourceTopicId, selected);
      const start = await this.lastNumber(tx, targetTopicId);
      await this.relocate(tx, posts, sourceTopicId, targetTopicId, start);
      await this.clearMovedAnswer(tx, sourceTopicId, posts);
      await this.refresh(tx, sourceTopicId);
      await this.refresh(tx, targetTopicId);
      await this.record(
        tx,
        actorId,
        'ForumTopic',
        targetTopicId,
        'posts.moved',
        {
          fromTopicId: sourceTopicId,
          numbers: posts.map(({ number }) => String(number)),
        },
      );
    });
    return this.topics.topic(actorId, targetTopicId);
  }

  async mergeTopics(
    actorId: string,
    sourceTopicId: string,
    targetTopicId: string,
  ): Promise<ForumTopicSummary> {
    const { source, target } = await this.pair(
      actorId,
      sourceTopicId,
      targetTopicId,
    );
    if (source.mergedIntoTopicId || target.mergedIntoTopicId) {
      this.conflict('A merged topic cannot be merged again.');
    }
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, [sourceTopicId, targetTopicId]);
      const posts = await tx.forumPost.findMany({
        where: { topicId: sourceTopicId },
        orderBy: { number: 'asc' },
      });
      const start = await this.lastNumber(tx, targetTopicId);
      await this.relocate(tx, posts, sourceTopicId, targetTopicId, start);
      await tx.forumTopicTag.deleteMany({ where: { topicId: sourceTopicId } });
      await tx.forumTopic.update({
        where: { id: sourceTopicId },
        data: {
          mergedIntoTopicId: targetTopicId,
          state: source.state === 'TRASHED' ? 'TRASHED' : 'CLOSED',
          postCount: 0,
          ratingUp: 0,
          ratingDown: 0,
          acceptedAnswerPostId: null,
          acceptedAt: null,
          acceptedById: null,
          curatorId: null,
        },
      });
      await this.refresh(tx, targetTopicId);
      await this.record(
        tx,
        actorId,
        'ForumTopic',
        targetTopicId,
        'topics.merged',
        {
          sourceTopicId,
          movedPosts: posts.length,
        },
      );
    });
    return this.topics.topic(actorId, targetTopicId);
  }

  async splitTopic(
    actorId: string,
    sourceTopicId: string,
    numbers: number[],
    title: string,
  ): Promise<ForumTopicSummary> {
    const selected = this.selection(numbers);
    const normalizedTitle = normalizeTopicTitle(title);
    const viewer = await this.viewer(actorId);
    const { topic: source, categoryId } = await this.topics.visibleTopic(
      sourceTopicId,
      viewer,
    );
    await this.requireModerator(viewer, categoryId);
    if (source.mergedIntoTopicId)
      this.conflict('A merged topic cannot be split.');
    const newTopicId = randomUUID();
    await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, [sourceTopicId]);
      const posts = await this.loadPosts(tx, sourceTopicId, selected);
      const first = posts[0];
      const targetId = randomUUID();
      await tx.interactionTarget.create({
        data: {
          id: targetId,
          kind: 'forum.topic',
          ownerModule: 'forum',
          ownerType: 'ForumTopic',
          ownerId: newTopicId,
        },
      });
      await tx.forumTopic.create({
        data: {
          id: newTopicId,
          forumId: source.forumId,
          interactionTargetId: targetId,
          authorId: first.authorId,
          kind: 'DISCUSSION',
          title: normalizedTitle,
          postCount: posts.length,
          lastPostNumber: posts.length,
          lastPostAt: first.createdAt,
          lastPostAuthorId: first.authorId,
          createdAt: first.createdAt,
        },
      });
      await this.relocate(tx, posts, sourceTopicId, newTopicId, 0);
      await this.clearMovedAnswer(tx, sourceTopicId, posts);
      await this.refresh(tx, sourceTopicId);
      await this.refresh(tx, newTopicId);
      await this.record(tx, actorId, 'ForumTopic', newTopicId, 'topic.split', {
        fromTopicId: sourceTopicId,
        numbers: posts.map(({ number }) => String(number)),
      });
    });
    return this.topics.topic(actorId, newTopicId);
  }

  /** Verbal warning by the topic curator or a category moderator. */
  async warnAuthor(
    actorId: string,
    postId: string,
    reason: string,
  ): Promise<IssuedSanctionReceipt> {
    const { post, topic, moderator } = await this.postScope(actorId, postId);
    if (!moderator && topic.curatorId !== actorId) {
      this.denied('Only the topic curator or a moderator can warn here.');
    }
    return this.sanctions.issueScoped({
      actorId,
      subjectId: post.authorId,
      kind: 'WARNING',
      reason,
      context: this.context(topic.id, post),
    });
  }

  /** Temporary read-only by a category moderator (never by curators). */
  async restrictAuthor(
    actorId: string,
    postId: string,
    reason: string,
    until: Date,
  ): Promise<IssuedSanctionReceipt> {
    const { post, topic, moderator } = await this.postScope(actorId, postId);
    if (!moderator) this.denied('Only moderators can apply read-only.');
    return this.sanctions.issueScoped({
      actorId,
      subjectId: post.authorId,
      kind: 'READ_ONLY',
      reason,
      context: this.context(topic.id, post),
      readOnlyUntil: until,
    });
  }

  private context(topicId: string, post: { id: string; number: number }) {
    return {
      type: 'forum.post',
      id: post.id,
      path: `/community/topics/${topicId}#post-${post.number}`,
    };
  }

  private async postScope(actorId: string, postId: string) {
    const viewer = await this.viewer(actorId);
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true, topicId: true, number: true, authorId: true },
    });
    if (!post) this.notFound('Post');
    const { topic, categoryId } = await this.topics.visibleTopic(
      post.topicId,
      viewer,
    );
    const moderator = await this.topics.isModerator(viewer, categoryId);
    return { post, topic, moderator };
  }

  private async pair(actorId: string, sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        'Choose two different topics.',
      );
    }
    const viewer = await this.viewer(actorId);
    const source = await this.topics.visibleTopic(sourceId, viewer);
    const target = await this.topics.visibleTopic(targetId, viewer);
    await this.requireModerator(viewer, source.categoryId);
    await this.requireModerator(viewer, target.categoryId);
    return { source: source.topic, target: target.topic };
  }

  private selection(numbers: number[]): number[] {
    const unique = [...new Set(numbers)].sort((a, b) => a - b);
    if (
      unique.length === 0 ||
      unique.length > MAX_MOVED_POSTS ||
      unique.some((n) => !Number.isInteger(n) || n < 2)
    ) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        `Select 1–${MAX_MOVED_POSTS} replies; the first post never moves alone.`,
      );
    }
    return unique;
  }

  private async loadPosts(
    tx: TransactionClient,
    topicId: string,
    numbers: number[],
  ): Promise<ForumPost[]> {
    const posts = await tx.forumPost.findMany({
      where: { topicId, number: { in: numbers } },
      orderBy: { number: 'asc' },
    });
    if (posts.length !== numbers.length) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        'Some selected posts do not exist.',
      );
    }
    return posts;
  }

  /** Renumbers posts after `start` in order and remaps internal references. */
  private async relocate(
    tx: TransactionClient,
    posts: ForumPost[],
    sourceTopicId: string,
    targetTopicId: string,
    start: number,
  ): Promise<void> {
    const mapping = new Map(
      posts.map((post, index) => [post.number, start + index + 1]),
    );
    for (const post of posts) {
      const replyTo =
        post.replyToNumber === null
          ? null
          : (mapping.get(post.replyToNumber) ?? null);
      const quotes = post.quotedNumbers
        .map((number) => mapping.get(number))
        .filter((number): number is number => number !== undefined);
      await tx.forumPost.update({
        where: { id: post.id },
        data: {
          topicId: targetTopicId,
          number: mapping.get(post.number)!,
          replyToNumber: replyTo,
          quotedNumbers: quotes,
          originalTopicId: post.originalTopicId ?? sourceTopicId,
          originalNumber: post.originalNumber ?? post.number,
        },
      });
    }
  }

  private async clearMovedAnswer(
    tx: TransactionClient,
    sourceTopicId: string,
    posts: ForumPost[],
  ): Promise<void> {
    await tx.forumTopic.updateMany({
      where: {
        id: sourceTopicId,
        acceptedAnswerPostId: { in: posts.map(({ id }) => id) },
      },
      data: {
        acceptedAnswerPostId: null,
        acceptedAt: null,
        acceptedById: null,
      },
    });
  }

  /** Recomputes counters, last activity and the post #1 rating mirror. */
  private async refresh(tx: TransactionClient, topicId: string): Promise<void> {
    const [count, last, first, latest] = await Promise.all([
      tx.forumPost.count({ where: { topicId } }),
      tx.forumPost.findFirst({
        where: { topicId },
        orderBy: { number: 'desc' },
      }),
      tx.forumPost.findFirst({
        where: { topicId },
        orderBy: { number: 'asc' },
      }),
      tx.forumPost.findFirst({
        where: { topicId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    if (!last || !first || !latest) return;
    await tx.forumTopic.update({
      where: { id: topicId },
      data: {
        postCount: count,
        lastPostNumber: Math.max(last.number, count),
        lastPostAt: latest.createdAt,
        lastPostAuthorId: latest.authorId,
        ratingUp: first.number === 1 ? first.ratingUp : 0,
        ratingDown: first.number === 1 ? first.ratingDown : 0,
      },
    });
  }

  private async lastNumber(
    tx: TransactionClient,
    topicId: string,
  ): Promise<number> {
    const topic = await tx.forumTopic.findUniqueOrThrow({
      where: { id: topicId },
      select: { lastPostNumber: true },
    });
    return topic.lastPostNumber;
  }

  private async lock(tx: TransactionClient, topicIds: string[]): Promise<void> {
    for (const id of [...new Set(topicIds)].sort()) {
      await tx.$queryRaw`SELECT 1 FROM "forum_topics" WHERE "id" = ${id} FOR UPDATE`;
    }
  }

  private async requireModerator(
    viewer: ForumViewerFacts,
    categoryId: string,
  ): Promise<void> {
    if (!(await this.topics.isModerator(viewer, categoryId))) {
      this.denied(
        'This action needs moderator scope in every affected category.',
      );
    }
  }

  private async viewer(actorId: string): Promise<ForumViewerFacts> {
    const viewer = await this.viewers.read(actorId, new Date());
    if (viewer.subjectId === null) this.denied('Sign in first.');
    return viewer;
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    targetType: 'ForumTopic',
    targetId: string,
    action: string,
    metadata: Record<string, string | number | null | string[]>,
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

  private conflict(message: string): never {
    throw new ForumCommandError('CONFLICT', message);
  }

  private denied(message: string): never {
    throw new ForumCommandError('ACCESS_DENIED', message);
  }

  private notFound(target: string): never {
    throw new ForumCommandError('NOT_FOUND', target + ' was not found.');
  }
}
