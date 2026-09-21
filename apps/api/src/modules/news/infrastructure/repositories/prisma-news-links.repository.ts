import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import {
  createEventEnvelope,
  type JsonValue,
  OutboxWriterService,
} from '@api/core/events';
import type { NewsLinksRepository } from '../../domain/repositories/news-links.repository.interface';
import type { NewsInternalLink } from '../../domain/types/news-links.type';

const targetSelect = {
  language: true,
  slug: true,
  title: true,
  shortText: true,
  coverMediaId: true,
  displayPublishedAt: true,
} as const;

@Injectable()
export class PrismaNewsLinksRepository implements NewsLinksRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async create(
    input: Parameters<NewsLinksRepository['create']>[0],
  ): Promise<NewsInternalLink | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const link = await transaction.newsInternalLink.create({
          data: {
            sourceArticleId: input.sourceArticleId,
            targetArticleId: input.targetArticleId,
            type: input.type,
            anchorText: input.anchorText,
            position: input.position,
            createdById: input.actorId,
          },
          include: { targetArticle: { select: targetSelect } },
        });
        await this.record(transaction, 'created', input.actorId, link.id, {
          sourceArticleId: link.sourceArticleId,
          targetArticleId: link.targetArticleId,
          type: link.type,
          anchorText: link.anchorText,
          position: link.position,
        });
        return this.toDomain(link);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2004')
      ) {
        return null;
      }
      throw error;
    }
  }

  async list(sourceArticleId: string): Promise<NewsInternalLink[]> {
    const links = await this.prisma.newsInternalLink.findMany({
      where: {
        sourceArticleId,
        targetArticle: { status: 'PUBLISHED' },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      include: { targetArticle: { select: targetSelect } },
    });
    return links.map((link) => this.toDomain(link));
  }

  remove(linkId: string, actorId: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const link = await transaction.newsInternalLink.findUnique({
        where: { id: linkId },
      });
      if (!link) return false;
      await transaction.newsInternalLink.delete({ where: { id: linkId } });
      await this.record(transaction, 'removed', actorId, link.id, {
        sourceArticleId: link.sourceArticleId,
        targetArticleId: link.targetArticleId,
        type: link.type,
      });
      return true;
    });
  }

  private toDomain(link: {
    id: string;
    sourceArticleId: string;
    targetArticleId: string;
    type: NewsInternalLink['type'];
    anchorText: string;
    position: number;
    createdById: string;
    createdAt: Date;
    targetArticle: {
      language: string;
      slug: string;
      title: string;
      shortText: string;
      coverMediaId: string | null;
      displayPublishedAt: Date | null;
    };
  }): NewsInternalLink {
    const displayPublishedAt = link.targetArticle.displayPublishedAt;
    if (!displayPublishedAt) {
      throw new Error('Linked published News is missing its display date.');
    }
    const { targetArticle, ...base } = link;
    return {
      ...base,
      target: {
        ...targetArticle,
        displayPublishedAt,
      },
    };
  }

  private async record(
    transaction: Prisma.TransactionClient,
    action: string,
    actorId: string,
    linkId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.append(transaction, {
      action: `news.link.${action}`,
      actorType: 'USER',
      actorId,
      targetType: 'NewsInternalLink',
      targetId: linkId,
      metadata: payload as JsonValue,
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: `news.link.${action}.v1`,
        version: 1,
        category: 'domain',
        producer: 'dss.api.news',
        actorId,
        aggregate: { type: 'NewsInternalLink', id: linkId },
        payload: payload as JsonValue,
      }),
    );
  }
}
