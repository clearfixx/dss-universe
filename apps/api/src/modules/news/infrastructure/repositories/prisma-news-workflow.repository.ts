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
      const eventStem = input.action.toLowerCase().replace('_', '-');
      const payload = {
        articleId: input.articleId,
        actorId: input.actorId,
        action: input.action,
        status: input.nextStatus,
        revisionVersion: input.expectedVersion,
        decisionId: decision.id,
        reason: input.reason,
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
      return { article: this.toDomain(article), decision };
    });
  }

  private timestamps(input: NewsEditorialTransition, now: Date) {
    switch (input.action) {
      case 'SUBMITTED':
        return { submittedAt: now, approvedAt: null, approvedVersion: null };
      case 'CHANGES_REQUESTED':
        return { approvedAt: null, approvedVersion: null };
      case 'APPROVED':
        return { approvedAt: now, approvedVersion: input.expectedVersion };
      case 'PUBLISHED':
        return { publishedAt: now, displayPublishedAt: now };
    }
  }

  private toDomain(article: NewsArticleRow): NewsArticle {
    return {
      ...article,
      document: article.document as unknown as EditorDocument,
    };
  }
}
