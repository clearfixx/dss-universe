import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import type { NewsPinsRepository } from '../../domain/repositories/news-pins.repository.interface';
import type { NewsPin, SetNewsPin } from '../../domain/types/news-pin.type';

const PRODUCER = 'dss.api.news';

@Injectable()
export class PrismaNewsPinsRepository implements NewsPinsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async set(input: SetNewsPin): Promise<NewsPin> {
    return this.prisma.$transaction(async (transaction) => {
      const article = await transaction.newsArticle.findUnique({
        where: { id: input.articleId },
        select: { id: true, status: true },
      });
      if (!article) throw new NotFoundException('News article was not found.');
      if (article.status !== 'PUBLISHED') {
        throw new BadRequestException('Only published News can be pinned.');
      }
      if (input.categoryId) {
        const category = await transaction.newsArticleCategory.findUnique({
          where: {
            articleId_categoryId: {
              articleId: input.articleId,
              categoryId: input.categoryId,
            },
          },
        });
        if (!category) {
          throw new BadRequestException(
            'A category pin must use a category assigned to the article.',
          );
        }
      }
      const pin = await transaction.newsPin.upsert({
        where: { articleId: input.articleId },
        update: {
          scope: input.scope,
          categoryId: input.categoryId,
          expiresAt: input.expiresAt,
          pinnedById: input.actorId,
        },
        create: {
          articleId: input.articleId,
          scope: input.scope,
          categoryId: input.categoryId,
          expiresAt: input.expiresAt,
          pinnedById: input.actorId,
        },
      });
      await this.evidence(transaction, input, 'set', pin.id);
      return pin;
    });
  }

  async remove(articleId: string, actorId: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const pin = await transaction.newsPin.findUnique({
        where: { articleId },
      });
      if (!pin) return false;
      await transaction.newsPin.delete({ where: { articleId } });
      await this.evidence(
        transaction,
        {
          articleId,
          actorId,
          scope: pin.scope,
          categoryId: pin.categoryId,
          expiresAt: pin.expiresAt,
        },
        'removed',
        pin.id,
      );
      return true;
    });
  }

  private async evidence(
    transaction: Prisma.TransactionClient,
    input: SetNewsPin,
    action: 'set' | 'removed',
    pinId: string,
  ): Promise<void> {
    const payload = {
      articleId: input.articleId,
      pinId,
      scope: input.scope,
      categoryId: input.categoryId,
      expiresAt: input.expiresAt?.toISOString() ?? null,
    };
    await this.audit.append(transaction, {
      action: `news.pin.${action}`,
      actorType: 'USER',
      actorId: input.actorId,
      targetType: 'NewsArticle',
      targetId: input.articleId,
      metadata: payload,
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: `news.pin.${action}.v1`,
        version: 1,
        category: 'domain',
        producer: PRODUCER,
        actorId: input.actorId,
        aggregate: { type: 'NewsArticle', id: input.articleId },
        payload,
      }),
    );
  }
}
