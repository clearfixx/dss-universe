/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-ratings.ts
 *
 * 🎯 Purpose:
 * Implements CH-2 content rating votes, moderator reversal, the voter dialog,
 * unique topic views, unread state and hot-ranking settings.
 *
 * ⚠️ Important:
 * • a vote changes only post (and, for post #1, topic) rating counters;
 * • votes are final; the primary key prevents double votes under concurrency;
 * • views count each signed-in user once per topic; guests are not tracked.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  FORUM_ACCOUNT_EVIDENCE,
  type ForumAccountEvidenceReader,
} from '../contracts/forum-account-evidence.contract';
import {
  FORUM_VIEWER_FACTS,
  type ForumViewerFactsReader,
} from '../contracts/forum-viewer-facts.contract';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import { normalizeModerationReason } from '../domain/forum-moderation.rules';
import {
  assertCanVote,
  DEFAULT_FORUM_RANKING,
  normalizeVoteValue,
  validateRankingSettings,
  type ForumRankingSettings,
} from '../domain/forum-rating.rules';
import type { ForumPage } from '../domain/types/forum-topic.type';
import { ForumTopicsService } from './prisma-forum-topics';

const PRODUCER = 'dss.api.forum';
const SETTINGS_ID = 'default';

export type ForumRating = {
  postId: string;
  ratingUp: number;
  ratingDown: number;
};

export type ForumVoteView = {
  voterId: string;
  value: number;
  createdAt: Date;
  reversed: boolean;
};

@Injectable()
export class ForumRatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    @Inject(FORUM_VIEWER_FACTS)
    private readonly viewers: ForumViewerFactsReader,
    @Inject(FORUM_ACCOUNT_EVIDENCE)
    private readonly accounts: ForumAccountEvidenceReader,
    private readonly topics: ForumTopicsService,
  ) {}

  async vote(
    actorId: string,
    postId: string,
    value: number,
  ): Promise<ForumRating> {
    const normalized = normalizeVoteValue(value);
    const viewer = await this.viewers.read(actorId, new Date());
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        topicId: true,
        number: true,
        authorId: true,
        state: true,
      },
    });
    if (!post) this.notFound('Post');
    const { topic } = await this.topics.visibleTopic(post.topicId, viewer);
    assertCanVote({
      voterId: actorId,
      account: await this.accounts.find(actorId),
      post,
      topicState: topic.state,
      now: new Date(),
    });
    const column = normalized === 1 ? 'ratingUp' : 'ratingDown';
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.forumPostVote.create({
          data: { postId, voterId: actorId, value: normalized },
        });
        await tx.forumPost.update({
          where: { id: postId },
          data: { [column]: { increment: 1 } },
        });
        if (post.number === 1) {
          await tx.forumTopic.update({
            where: { id: post.topicId },
            data: { [column]: { increment: 1 } },
          });
        }
        await this.record(tx, actorId, postId, 'post.voted', {
          topicId: post.topicId,
          number: post.number,
          value: normalized,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForumCommandError(
          'CONFLICT',
          'You have already rated this post; votes are final.',
        );
      }
      throw error;
    }
    return this.rating(postId);
  }

  async reverseVote(
    actorId: string,
    postId: string,
    voterId: string,
    reason: string,
  ): Promise<ForumRating> {
    const viewer = await this.viewers.read(actorId, new Date());
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { topicId: true, number: true },
    });
    if (!post) this.notFound('Post');
    const { categoryId, forum } = await this.topics.visibleTopic(
      post.topicId,
      viewer,
    );
    if (!(await this.topics.isModerator(viewer, categoryId, forum))) {
      throw new ForumCommandError(
        'ACCESS_DENIED',
        'Only moderators can reverse votes.',
      );
    }
    const reversalReason = normalizeModerationReason(reason);
    await this.prisma.$transaction(async (tx) => {
      const vote = await tx.forumPostVote.findUnique({
        where: { postId_voterId: { postId, voterId } },
      });
      if (!vote) this.notFound('Vote');
      const reversed = await tx.forumPostVote.updateMany({
        where: { postId, voterId, reversedAt: null },
        data: { reversedAt: new Date(), reversedById: actorId, reversalReason },
      });
      if (reversed.count !== 1) {
        throw new ForumCommandError(
          'CONFLICT',
          'The vote is already reversed.',
        );
      }
      const column = vote.value === 1 ? 'ratingUp' : 'ratingDown';
      await tx.forumPost.update({
        where: { id: postId },
        data: { [column]: { decrement: 1 } },
      });
      if (post.number === 1) {
        await tx.forumTopic.update({
          where: { id: post.topicId },
          data: { [column]: { decrement: 1 } },
        });
      }
      await this.record(tx, actorId, postId, 'vote.reversed', {
        topicId: post.topicId,
        voterId,
        value: vote.value,
        reason: reversalReason,
      });
    });
    return this.rating(postId);
  }

  /** The rating dialog: every voter, their vote and whether it was reversed. */
  async votes(
    viewerId: string | null,
    postId: string,
    page: number,
    limit: number,
  ): Promise<ForumPage<ForumVoteView>> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { topicId: true, state: true },
    });
    if (!post || post.state !== 'VISIBLE') this.notFound('Post');
    await this.topics.visibleTopic(post.topicId, viewer);
    const safePage = Math.max(1, Math.trunc(page) || 1);
    const take = Math.min(100, Math.max(1, Math.trunc(limit) || 50));
    const [rows, total] = await Promise.all([
      this.prisma.forumPostVote.findMany({
        where: { postId },
        orderBy: [{ createdAt: 'asc' }, { voterId: 'asc' }],
        skip: (safePage - 1) * take,
        take,
      }),
      this.prisma.forumPostVote.count({ where: { postId } }),
    ]);
    return {
      items: rows.map((row) => ({
        voterId: row.voterId,
        value: row.value,
        createdAt: row.createdAt,
        reversed: row.reversedAt !== null,
      })),
      total,
      page: safePage,
      limit: take,
    };
  }

  /** Counts a signed-in user's first view of a topic. Guests are not tracked. */
  async recordView(viewerId: string, topicId: string): Promise<void> {
    const viewer = await this.viewers.read(viewerId, new Date());
    if (viewer.subjectId === null) return;
    await this.topics.visibleTopic(topicId, viewer);
    await this.prisma.$transaction(async (tx) => {
      const inserted = await tx.$executeRaw`
        INSERT INTO "forum_topic_views" ("topicId", "userId")
        VALUES (${topicId}, ${viewerId})
        ON CONFLICT DO NOTHING`;
      if (inserted === 1) {
        await tx.forumTopic.update({
          where: { id: topicId },
          data: { viewCount: { increment: 1 } },
        });
      }
    });
  }

  async markRead(
    viewerId: string,
    topicId: string,
    upToNumber: number,
  ): Promise<number> {
    const viewer = await this.viewers.read(viewerId, new Date());
    if (viewer.subjectId === null) {
      throw new ForumCommandError('ACCESS_DENIED', 'Sign in to track reading.');
    }
    const { topic } = await this.topics.visibleTopic(topicId, viewer);
    if (!Number.isInteger(upToNumber) || upToNumber < 1) {
      throw new ForumCommandError('INVALID_INPUT', 'Invalid post number.');
    }
    const number = Math.min(upToNumber, topic.lastPostNumber);
    // Reading never moves backwards: GREATEST keeps the furthest position.
    await this.prisma.$executeRaw`
      INSERT INTO "forum_topic_read_states" ("userId", "topicId", "lastReadNumber", "updatedAt")
      VALUES (${viewerId}, ${topicId}, ${number}, ${new Date()})
      ON CONFLICT ("userId", "topicId") DO UPDATE SET
        "lastReadNumber" = GREATEST("forum_topic_read_states"."lastReadNumber", EXCLUDED."lastReadNumber"),
        "updatedAt" = EXCLUDED."updatedAt"`;
    const state = await this.prisma.forumTopicReadState.findUniqueOrThrow({
      where: { userId_topicId: { userId: viewerId, topicId } },
    });
    return state.lastReadNumber;
  }

  async rankingSettings(): Promise<ForumRankingSettings> {
    const row = await this.prisma.forumRankingSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    return row
      ? {
          hotGravitySeconds: row.hotGravitySeconds,
          hotReplyWeight: row.hotReplyWeight,
        }
      : { ...DEFAULT_FORUM_RANKING };
  }

  async updateRankingSettings(
    actorId: string,
    settings: ForumRankingSettings,
  ): Promise<ForumRankingSettings> {
    const viewer = await this.viewers.read(actorId, new Date());
    if (!viewer.seesAllCategories) {
      throw new ForumCommandError('ACCESS_DENIED', 'Insufficient permissions.');
    }
    validateRankingSettings(settings);
    await this.prisma.$transaction(async (tx) => {
      await tx.forumRankingSettings.upsert({
        where: { id: SETTINGS_ID },
        create: { id: SETTINGS_ID, ...settings, updatedById: actorId },
        update: { ...settings, updatedById: actorId },
      });
      await this.audit.append(tx, {
        action: 'forum.ranking_settings_updated',
        actorType: 'USER',
        actorId,
        targetType: 'ForumRankingSettings',
        targetId: SETTINGS_ID,
        metadata: settings,
      });
    });
    return settings;
  }

  private async rating(postId: string): Promise<ForumRating> {
    const post = await this.prisma.forumPost.findUniqueOrThrow({
      where: { id: postId },
      select: { id: true, ratingUp: true, ratingDown: true },
    });
    return {
      postId: post.id,
      ratingUp: post.ratingUp,
      ratingDown: post.ratingDown,
    };
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    postId: string,
    action: string,
    metadata: Record<string, string | number>,
  ): Promise<void> {
    await this.audit.append(tx, {
      action: 'forum.' + action.replaceAll('.', '_'),
      actorType: 'USER',
      actorId,
      targetType: 'ForumPost',
      targetId: postId,
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
        aggregate: { type: 'ForumPost', id: postId },
        payload: { postId, ...metadata },
      }),
    );
  }

  private notFound(target: string): never {
    throw new ForumCommandError('NOT_FOUND', target + ' was not found.');
  }
}
