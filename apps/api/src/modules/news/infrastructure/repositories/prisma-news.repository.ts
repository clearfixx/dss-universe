import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, type NewsArticle as NewsArticleRow } from '@prisma/client';
import type { EditorDocument } from '@dss/editor';
import { randomUUID } from 'node:crypto';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import { InteractionTargetWriterService } from '../../../interactions';
import { NEWS_INTERACTION_KIND } from '../../application/services/news-interaction.policy';
import type { NewsRepository } from '../../domain/repositories/news.repository.interface';
import type {
  CreateNewsDraft,
  NewsArticle,
  NewsEditorialListPage,
  NewsEditorialListQuery,
  SaveNewsDraft,
} from '../../domain/types/news-article.type';

const PRODUCER = 'dss.api.news';
const OWNER_TYPE = 'NewsArticle';
const ATTACHMENT_PURPOSE = 'news.attachment';

@Injectable()
export class PrismaNewsRepository implements NewsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    private readonly interactionTargets: InteractionTargetWriterService,
  ) {}

  async createDraft(input: CreateNewsDraft): Promise<NewsArticle> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const articleId = randomUUID();
        const interactionTargetId = randomUUID();
        await this.interactionTargets.register(transaction, {
          id: interactionTargetId,
          kind: NEWS_INTERACTION_KIND,
          ownerModule: 'news',
          ownerType: OWNER_TYPE,
          ownerId: articleId,
          actorId: input.authorId,
        });
        const article = await transaction.newsArticle.create({
          data: {
            id: articleId,
            interactionTargetId,
            authorId: input.authorId,
            postType: input.postType,
            visibility: input.visibility,
            language: input.language,
            slug: input.slug,
            title: input.title,
            shortText: input.shortText,
            document: input.document as unknown as Prisma.InputJsonValue,
            templateData: input.templateData as Prisma.InputJsonValue,
            plainText: input.plainText,
            searchText: input.searchText,
            coverMediaId: input.coverMediaId,
          },
        });
        await this.syncAttachments(
          transaction,
          articleId,
          input.authorId,
          input.attachmentMediaIds,
        );
        const revision = await transaction.newsRevision.create({
          data: {
            articleId,
            version: 1,
            editorId: input.authorId,
            postType: input.postType,
            language: input.language,
            slug: input.slug,
            title: input.title,
            shortText: input.shortText,
            document: input.document as unknown as Prisma.InputJsonValue,
            templateData: input.templateData as Prisma.InputJsonValue,
            plainText: input.plainText,
            searchText: input.searchText,
            coverMediaId: input.coverMediaId,
            changeSummary: 'Initial draft',
          },
        });
        const payload = {
          articleId,
          authorId: input.authorId,
          revisionId: revision.id,
          version: 1,
          postType: input.postType,
          language: input.language,
          slug: input.slug,
          status: article.status,
        };
        await this.audit.append(transaction, {
          action: 'news.article.created',
          actorType: 'USER',
          actorId: input.authorId,
          targetType: OWNER_TYPE,
          targetId: articleId,
          metadata: payload,
        });
        await this.outbox.append(
          transaction,
          createEventEnvelope({
            name: 'news.article.created.v1',
            version: 1,
            category: 'domain',
            producer: PRODUCER,
            actorId: input.authorId,
            aggregate: { type: OWNER_TYPE, id: articleId },
            payload,
          }),
        );
        return this.toDomain(article);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'News slug already exists for this language.',
        );
      }
      throw error;
    }
  }

  async findById(id: string): Promise<NewsArticle | null> {
    const article = await this.prisma.newsArticle.findUnique({ where: { id } });
    return article ? this.toDomain(article) : null;
  }

  async findBySlug(
    language: string,
    slug: string,
  ): Promise<NewsArticle | null> {
    const article = await this.prisma.newsArticle.findUnique({
      where: { language_slug: { language, slug } },
    });
    return article ? this.toDomain(article) : null;
  }

  async listEditorial(
    input: NewsEditorialListQuery,
  ): Promise<NewsEditorialListPage> {
    const where: Prisma.NewsArticleWhereInput = {
      ...(input.includeAll ? {} : { authorId: input.actorId }),
      ...(input.statuses?.length ? { status: { in: input.statuses } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.newsArticle.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.prisma.newsArticle.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }

  async saveDraft(input: SaveNewsDraft): Promise<NewsArticle | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const nextVersion = input.baseVersion + 1;
        const changed = await transaction.newsArticle.updateMany({
          where: {
            id: input.articleId,
            authorId: input.authorId,
            currentVersion: input.baseVersion,
            status: { in: ['DRAFT', 'CHANGES_REQUESTED'] },
          },
          data: {
            postType: input.postType,
            visibility: input.visibility,
            language: input.language,
            slug: input.slug,
            title: input.title,
            shortText: input.shortText,
            document: input.document as unknown as Prisma.InputJsonValue,
            templateData: input.templateData as Prisma.InputJsonValue,
            plainText: input.plainText,
            searchText: input.searchText,
            coverMediaId: input.coverMediaId,
            currentVersion: nextVersion,
          },
        });
        if (changed.count !== 1) return null;
        await this.syncAttachments(
          transaction,
          input.articleId,
          input.authorId,
          input.attachmentMediaIds,
        );
        const revision = await transaction.newsRevision.create({
          data: {
            articleId: input.articleId,
            version: nextVersion,
            editorId: input.authorId,
            postType: input.postType,
            language: input.language,
            slug: input.slug,
            title: input.title,
            shortText: input.shortText,
            document: input.document as unknown as Prisma.InputJsonValue,
            templateData: input.templateData as Prisma.InputJsonValue,
            plainText: input.plainText,
            searchText: input.searchText,
            coverMediaId: input.coverMediaId,
            changeSummary: input.changeSummary,
          },
        });
        const article = await transaction.newsArticle.findUniqueOrThrow({
          where: { id: input.articleId },
        });
        const payload = {
          articleId: article.id,
          authorId: input.authorId,
          revisionId: revision.id,
          version: nextVersion,
          previousVersion: input.baseVersion,
          status: article.status,
        };
        await this.audit.append(transaction, {
          action: 'news.article.draft_saved',
          actorType: 'USER',
          actorId: input.authorId,
          targetType: OWNER_TYPE,
          targetId: article.id,
          metadata: payload,
        });
        await this.outbox.append(
          transaction,
          createEventEnvelope({
            name: 'news.article.draft-saved.v1',
            version: 1,
            category: 'domain',
            producer: PRODUCER,
            actorId: input.authorId,
            aggregate: { type: OWNER_TYPE, id: article.id },
            payload,
          }),
        );
        return this.toDomain(article);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'News slug already exists for this language.',
        );
      }
      throw error;
    }
  }

  private toDomain(article: NewsArticleRow): NewsArticle {
    return {
      ...article,
      document: article.document as unknown as EditorDocument,
    };
  }

  private async syncAttachments(
    transaction: Prisma.TransactionClient,
    articleId: string,
    actorId: string,
    mediaIds: string[],
  ): Promise<void> {
    await transaction.mediaReference.updateMany({
      where: {
        targetType: OWNER_TYPE,
        targetId: articleId,
        purpose: ATTACHMENT_PURPOSE,
        removedAt: null,
        ...(mediaIds.length ? { mediaId: { notIn: mediaIds } } : {}),
      },
      data: { removedAt: new Date() },
    });
    for (const mediaId of mediaIds) {
      const existing = await transaction.mediaReference.findFirst({
        where: {
          mediaId,
          targetType: OWNER_TYPE,
          targetId: articleId,
          purpose: ATTACHMENT_PURPOSE,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        if (existing.removedAt) {
          await transaction.mediaReference.update({
            where: { id: existing.id },
            data: { removedAt: null, createdBy: actorId },
          });
        }
      } else {
        await transaction.mediaReference.create({
          data: {
            mediaId,
            targetType: OWNER_TYPE,
            targetId: articleId,
            purpose: ATTACHMENT_PURPOSE,
            createdBy: actorId,
          },
        });
      }
    }
  }
}
