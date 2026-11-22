/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-integrations.ts
 *
 * 🎯 Purpose:
 * Implements CH-5a: topic subscriptions and News discussion links, and
 * CH-6 section follows.
 *
 * ⚠️ Important:
 * Subscriptions only record intent; notification delivery is Phase 15 and
 * consumes the existing `forum.post.created.v1` events.
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
  FORUM_NEWS_FACTS,
  type ForumNewsFactsReader,
} from '../contracts/forum-news-facts.contract';
import {
  FORUM_VIEWER_FACTS,
  type ForumViewerFactsReader,
} from '../contracts/forum-viewer-facts.contract';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import type { ForumViewerFacts } from '../domain/types/forum-structure.type';
import type { ForumTopicSummary } from '../domain/types/forum-topic.type';
import { ForumTopicsService } from './prisma-forum-topics';

const PRODUCER = 'dss.api.forum';

@Injectable()
export class ForumIntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    @Inject(FORUM_VIEWER_FACTS)
    private readonly viewers: ForumViewerFactsReader,
    @Inject(FORUM_NEWS_FACTS)
    private readonly news: ForumNewsFactsReader,
    private readonly topics: ForumTopicsService,
  ) {}

  async subscribe(actorId: string, topicId: string): Promise<boolean> {
    const viewer = await this.viewer(actorId);
    await this.topics.visibleTopic(topicId, viewer);
    await this.prisma.forumTopicSubscription.upsert({
      where: { userId_topicId: { userId: actorId, topicId } },
      create: { userId: actorId, topicId },
      update: {},
    });
    return true;
  }

  async unsubscribe(actorId: string, topicId: string): Promise<boolean> {
    await this.viewer(actorId);
    await this.prisma.forumTopicSubscription.deleteMany({
      where: { userId: actorId, topicId },
    });
    return false;
  }

  async isSubscribed(
    viewerId: string | null,
    topicId: string,
  ): Promise<boolean> {
    if (!viewerId) return false;
    const row = await this.prisma.forumTopicSubscription.findUnique({
      where: { userId_topicId: { userId: viewerId, topicId } },
      select: { topicId: true },
    });
    return row !== null;
  }

  /** Follows a section the viewer can see; new topics then reach them. */
  async followForum(actorId: string, forumId: string): Promise<boolean> {
    await this.topics.assertVisibleForum(actorId, forumId);
    await this.prisma.forumFollow.upsert({
      where: { userId_forumId: { userId: actorId, forumId } },
      create: { userId: actorId, forumId },
      update: {},
    });
    return true;
  }

  async unfollowForum(actorId: string, forumId: string): Promise<boolean> {
    await this.viewer(actorId);
    await this.prisma.forumFollow.deleteMany({
      where: { userId: actorId, forumId },
    });
    return false;
  }

  async isFollowingForum(
    viewerId: string | null,
    forumId: string,
  ): Promise<boolean> {
    if (!viewerId) return false;
    const row = await this.prisma.forumFollow.findUnique({
      where: { userId_forumId: { userId: viewerId, forumId } },
      select: { forumId: true },
    });
    return row !== null;
  }

  /**
   * Links a published article to its canonical discussion topic. Allowed for
   * the article author, a moderator of the topic's category, supermoderators
   * and administrators.
   */
  async linkNewsDiscussion(
    actorId: string,
    articleId: string,
    topicId: string,
  ): Promise<ForumTopicSummary> {
    const viewer = await this.viewer(actorId);
    const { topic, categoryId } = await this.topics.visibleTopic(
      topicId,
      viewer,
    );
    if (topic.mergedIntoTopicId || topic.state === 'TRASHED') {
      throw new ForumCommandError(
        'CONFLICT',
        'Choose an active discussion topic.',
      );
    }
    const article = await this.news.find(articleId, new Date());
    if (!article?.published) this.notFound('Published article');
    await this.requireLinkAuthority(viewer, article.authorId, categoryId);
    try {
      await this.prisma.$transaction(async (tx) => {
        const previous = await tx.forumNewsDiscussion.findUnique({
          where: { newsArticleId: articleId },
        });
        await tx.forumNewsDiscussion.upsert({
          where: { newsArticleId: articleId },
          create: { newsArticleId: articleId, topicId, linkedById: actorId },
          update: { topicId, linkedById: actorId, linkedAt: new Date() },
        });
        await this.record(tx, actorId, topicId, 'news_discussion.linked', {
          articleId,
          previousTopicId: previous?.topicId ?? null,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForumCommandError(
          'CONFLICT',
          'This topic already discusses another article.',
        );
      }
      throw error;
    }
    return this.topics.topic(actorId, topicId);
  }

  async unlinkNewsDiscussion(
    actorId: string,
    articleId: string,
  ): Promise<boolean> {
    const viewer = await this.viewer(actorId);
    const link = await this.prisma.forumNewsDiscussion.findUnique({
      where: { newsArticleId: articleId },
    });
    if (!link) this.notFound('Discussion link');
    const { categoryId } = await this.topics.visibleTopic(link.topicId, viewer);
    const article = await this.news.find(articleId, new Date());
    await this.requireLinkAuthority(
      viewer,
      article?.authorId ?? null,
      categoryId,
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.forumNewsDiscussion.delete({
        where: { newsArticleId: articleId },
      });
      await this.record(tx, actorId, link.topicId, 'news_discussion.unlinked', {
        articleId,
        previousTopicId: link.topicId,
      });
    });
    return true;
  }

  /** The article page renders the link only when the viewer can see the topic. */
  async newsDiscussion(
    viewerId: string | null,
    articleId: string,
  ): Promise<ForumTopicSummary | null> {
    const link = await this.prisma.forumNewsDiscussion.findUnique({
      where: { newsArticleId: articleId },
    });
    if (!link) return null;
    try {
      return await this.topics.topic(viewerId, link.topicId);
    } catch (error) {
      if (error instanceof ForumCommandError && error.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  private async requireLinkAuthority(
    viewer: ForumViewerFacts,
    articleAuthorId: string | null,
    categoryId: string,
  ): Promise<void> {
    if (viewer.subjectId !== null && viewer.subjectId === articleAuthorId)
      return;
    if (await this.topics.isModerator(viewer, categoryId)) return;
    throw new ForumCommandError(
      'ACCESS_DENIED',
      'Only the article author or a moderator of this category can link it.',
    );
  }

  private async viewer(actorId: string): Promise<ForumViewerFacts> {
    const viewer = await this.viewers.read(actorId, new Date());
    if (viewer.subjectId === null) {
      throw new ForumCommandError('ACCESS_DENIED', 'Sign in first.');
    }
    return viewer;
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    topicId: string,
    action: string,
    metadata: Record<string, string | null>,
  ): Promise<void> {
    await this.audit.append(tx, {
      action: 'forum.' + action.replaceAll('.', '_'),
      actorType: 'USER',
      actorId,
      targetType: 'ForumTopic',
      targetId: topicId,
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
        aggregate: { type: 'ForumTopic', id: topicId },
        payload: { topicId, ...metadata },
      }),
    );
  }

  private notFound(target: string): never {
    throw new ForumCommandError('NOT_FOUND', target + ' was not found.');
  }
}
