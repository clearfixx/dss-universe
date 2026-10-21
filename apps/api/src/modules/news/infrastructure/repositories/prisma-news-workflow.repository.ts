import { Injectable } from '@nestjs/common';
import { type NewsArticle as NewsArticleRow } from '@prisma/client';
import type { EditorDocument } from '@dss/editor';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import type { NewsWorkflowRepository } from '../../domain/repositories/news-workflow.repository.interface';
import type {
  NewsEditorialTransition,
  NewsEditorialTransitionResult,
} from '../../domain/types/news-editorial.type';
import type { NewsArticle } from '../../domain/types/news-article.type';

const PRODUCER = 'dss.api.news';
const OWNER_TYPE = 'NewsArticle';

@Injectable()
export class PrismaNewsWorkflowRepository implements NewsWorkflowRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  transition(
    input: NewsEditorialTransition,
  ): Promise<NewsEditorialTransitionResult | null> {
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const timestamps = this.timestamps(input, now);
      const changed = await transaction.newsArticle.updateMany({
        where: {
          id: input.articleId,
          status: input.expectedStatus,
          currentVersion: input.expectedVersion,
          ...(input.action === 'PUBLISHED'
            ? { approvedVersion: input.expectedVersion }
            : {}),
        },
        data: { status: input.nextStatus, ...timestamps },
      });
      if (changed.count !== 1) return null;

      const decision = await transaction.newsEditorialDecision.create({
        data: {
          articleId: input.articleId,
          revisionVersion: input.expectedVersion,
          actorId: input.actorId,
          action: input.action,
          reason: input.reason,
        },
      });
      const article = await transaction.newsArticle.findUniqueOrThrow({
        where: { id: input.articleId },
      });
      const integration = await transaction.newsArticle.findUniqueOrThrow({
        where: { id: input.articleId },
        select: {
          authorId: true,
          language: true,
          slug: true,
          title: true,
          visibility: true,
          allowIndexing: true,
          categories: {
            where: { isPrimary: true },
            take: 1,
            select: { category: { select: { slug: true } } },
          },
          tags: {
            orderBy: { tag: { slug: 'asc' } },
            select: { tag: { select: { slug: true } } },
          },
        },
      });
      const eventStem = input.action.toLowerCase().replace('_', '-');
      const payload = {
        articleId: input.articleId,
        authorId: integration.authorId,
        actorId: input.actorId,
        action: input.action,
        status: input.nextStatus,
        revisionVersion: input.expectedVersion,
        decisionId: decision.id,
        reason: input.reason,
        scheduledFor: input.scheduledFor?.toISOString() ?? null,
        displayPublishedAt: input.displayPublishedAt?.toISOString() ?? null,
        language: integration.language,
        slug: integration.slug,
        title: integration.title,
        visibility: integration.visibility,
        allowIndexing: integration.allowIndexing,
        categorySlug: integration.categories.at(0)?.category.slug ?? null,
        tags: integration.tags.map(({ tag }) => tag.slug).join(','),
      };
      await this.audit.append(transaction, {
        action: `news.article.${eventStem}`,
        actorType: 'USER',
        actorId: input.actorId,
        targetType: OWNER_TYPE,
        targetId: input.articleId,
        reason: input.reason ?? undefined,
        metadata: payload,
      });
      await this.outbox.append(
        transaction,
        createEventEnvelope({
          name: `news.article.${eventStem}.v1`,
          version: 1,
          category: 'domain',
          producer: PRODUCER,
          actorId: input.actorId,
          aggregate: { type: OWNER_TYPE, id: input.articleId },
          payload,
        }),
      );
      await this.outbox.append(
        transaction,
        createEventEnvelope({
          name: 'notifications.news.editorial-status.v1',
          version: 1,
          category: 'integration',
          producer: PRODUCER,
          actorId: input.actorId,
          aggregate: { type: OWNER_TYPE, id: input.articleId },
          payload: {
            articleId: input.articleId,
            authorId: integration.authorId,
            recipientId:
              input.action === 'SUBMITTED' ? null : integration.authorId,
            audience:
              input.action === 'SUBMITTED' ? 'NEWS_REVIEWERS' : 'AUTHOR',
            status: input.nextStatus,
            action: input.action,
            language: integration.language,
            slug: integration.slug,
            title: integration.title,
          },
        }),
      );
      return { article: this.toDomain(article), decision };
    });
  }

  async publishDue(
    now: Date,
    limit: number,
  ): Promise<NewsEditorialTransitionResult[]> {
    const candidates = await this.prisma.newsArticle.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: { lte: now },
        scheduledById: { not: null },
      },
      orderBy: [{ scheduledFor: 'asc' }, { id: 'asc' }],
      take: limit,
      select: {
        id: true,
        currentVersion: true,
        scheduledById: true,
        displayPublishedAt: true,
      },
    });
    const published: NewsEditorialTransitionResult[] = [];
    for (const candidate of candidates) {
      if (!candidate.scheduledById) continue;
      const result = await this.transition({
        articleId: candidate.id,
        actorId: candidate.scheduledById,
        expectedStatus: 'SCHEDULED',
        expectedVersion: candidate.currentVersion,
        nextStatus: 'PUBLISHED',
        action: 'PUBLISHED',
        reason: 'Scheduled publication became due.',
        displayPublishedAt: candidate.displayPublishedAt,
      });
      if (result) published.push(result);
    }
    return published;
  }

  private timestamps(input: NewsEditorialTransition, now: Date) {
    switch (input.action) {
      case 'SUBMITTED':
        return { submittedAt: now, approvedAt: null, approvedVersion: null };
      case 'CHANGES_REQUESTED':
        return { approvedAt: null, approvedVersion: null };
      case 'APPROVED':
        return { approvedAt: now, approvedVersion: input.expectedVersion };
      case 'SCHEDULED':
        return {
          scheduledFor: input.scheduledFor,
          scheduledById: input.actorId,
          displayPublishedAt: input.displayPublishedAt,
        };
      case 'SCHEDULE_CANCELLED':
        return {
          scheduledFor: null,
          scheduledById: null,
          displayPublishedAt: null,
        };
      case 'PUBLISHED':
        return {
          publishedAt: now,
          displayPublishedAt:
            input.displayPublishedAt ??
            (input.expectedStatus === 'SCHEDULED' ? undefined : now),
          scheduledFor: null,
          scheduledById: null,
        };
    }
  }

  private toDomain(article: NewsArticleRow): NewsArticle {
    return {
      ...article,
      document: article.document as unknown as EditorDocument,
    };
  }
}
