import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import {
  createEventEnvelope,
  type JsonValue,
  OutboxWriterService,
} from '@api/core/events';
import type { NewsTaxonomyRepository } from '../../domain/repositories/news-taxonomy.repository.interface';
import type {
  CreateNewsCategory,
  CreateNewsFieldDefinition,
  CreateNewsTag,
  NewsCategory,
  NewsFieldDefinition,
  NewsTag,
} from '../../domain/types/news-taxonomy.type';
import type { NewsPostType } from '../../domain/types/news-article.type';

const PRODUCER = 'dss.api.news';

@Injectable()
export class PrismaNewsTaxonomyRepository implements NewsTaxonomyRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
  ) {}

  async createCategory(input: CreateNewsCategory): Promise<NewsCategory> {
    return this.withConflict(async () =>
      this.prisma.$transaction(async (transaction) => {
        const category = await transaction.newsCategory.create({
          data: {
            parentId: input.parentId,
            name: input.name,
            slug: input.slug,
            description: input.description,
            icon: input.icon,
            sortOrder: input.sortOrder,
            isActive: input.isActive,
            allowedPostTypes: input.allowedPostTypes,
            allowComments: input.allowComments,
            allowRating: input.allowRating,
            allowIndexing: input.allowIndexing,
          },
        });
        await this.record(
          transaction,
          input.actorId,
          'category.created',
          'NewsCategory',
          category.id,
          { slug: category.slug, parentId: category.parentId },
        );
        return category;
      }),
    );
  }

  async createTag(input: CreateNewsTag): Promise<NewsTag> {
    return this.withConflict(async () =>
      this.prisma.$transaction(async (transaction) => {
        const tag = await transaction.newsTag.create({
          data: { name: input.name, slug: input.slug },
        });
        await this.record(
          transaction,
          input.actorId,
          'tag.created',
          'NewsTag',
          tag.id,
          { slug: tag.slug },
        );
        return tag;
      }),
    );
  }

  async createFieldDefinition(
    input: CreateNewsFieldDefinition,
  ): Promise<NewsFieldDefinition> {
    return this.withConflict(async () =>
      this.prisma.$transaction(async (transaction) => {
        const definition = await transaction.newsFieldDefinition.create({
          data: {
            categoryId: input.categoryId,
            postType: input.postType,
            key: input.key,
            label: input.label,
            type: input.type,
            required: input.required,
            showInShort: input.showInShort,
            showInFull: input.showInFull,
            includeInSearch: input.includeInSearch,
            filterable: input.filterable,
            options:
              input.options === null
                ? Prisma.JsonNull
                : (input.options as Prisma.InputJsonValue),
            isActive: input.isActive,
          },
        });
        await this.record(
          transaction,
          input.actorId,
          'field.created',
          'NewsFieldDefinition',
          definition.id,
          {
            key: definition.key,
            type: definition.type,
            categoryId: definition.categoryId,
            postType: definition.postType,
          },
        );
        return definition;
      }),
    );
  }

  async categoryExists(id: string): Promise<boolean> {
    return (await this.prisma.newsCategory.count({ where: { id } })) === 1;
  }

  async scopeFieldKeyExists(
    categoryId: string | null,
    postType: NewsPostType | null,
    key: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.newsFieldDefinition.count({
        where: {
          categoryId,
          postType,
          key,
        },
      })) > 0
    );
  }

  private async record(
    transaction: TransactionClient,
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    payload: Record<string, JsonValue>,
  ): Promise<void> {
    await this.audit.append(transaction, {
      action: `news.${action}`,
      actorType: 'USER',
      actorId,
      targetType,
      targetId,
      metadata: payload,
    });
    await this.outbox.append(
      transaction,
      createEventEnvelope({
        name: `news.${action}.v1`,
        version: 1,
        category: 'domain',
        producer: PRODUCER,
        actorId,
        aggregate: { type: targetType, id: targetId },
        payload,
      }),
    );
  }

  private async withConflict<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('News taxonomy value already exists.');
      }
      throw error;
    }
  }
}
