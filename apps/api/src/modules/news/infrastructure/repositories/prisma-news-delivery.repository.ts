/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Persistence
 * 📄 File: apps/api/src/modules/news/infrastructure/repositories/prisma-news-delivery.repository.ts
 *
 * 🎯 Purpose:
 * Reads only News-owned content, audience, links and page selections inside a supplied snapshot.
 *
 * 🧠 Responsibilities:
 * • preserves eligibility, pins, filters, search selection and chronological navigation;
 * • maps owned article fields without querying Users or Interactions;
 * • checks secondary-read flags before root composition asks other owners for facts.
 *
 * 🏗️ Architecture:
 * Guarded infrastructure-only adapter. Root read composition owns the transaction.
 *
 * ⚠️ Important:
 * No profile, comment, reaction or share SQL belongs here; no ORM enters business ports.
 * Search retains complete matching and its existing live Editor/ContentAccess boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaNewsSearchSession } from './prisma-news-search.session';
import type { NewsFullRecord } from '../../domain/types/news-full-record.type';
import type {
  NewsChronologicalNavigation,
  NewsChronologicalNeighbor,
} from '../../domain/types/news-links.type';
import type {
  ShortNewsItem,
  ShortNewsQuery,
  ShortNewsNumberedQuery,
} from '../../domain/types/short-news.type';

type SharedQuery = Omit<ShortNewsQuery, 'first' | 'cursor'>;
export type NewsDeliveryContent = Omit<
  ShortNewsItem,
  'author' | 'engagement'
> & { authorId: string };
export type NewsFullContent = Omit<
  NewsFullRecord,
  'author' | 'engagement' | 'sharing'
> & { authorId: string };

@Injectable()
export class PrismaNewsDeliveryRepository {
  constructor(private readonly search: PrismaNewsSearchSession) {}

  async browseShort(
    transaction: Prisma.TransactionClient,
    input: ShortNewsQuery,
  ) {
    if (input.search) {
      const selection = await this.search.select(transaction, input);
      return {
        items: await this.rows(transaction, input, 0, input.first, undefined, {
          id: { in: selection.itemIds },
        }),
        pinnedItems: await this.rows(transaction, input, 0, 20, undefined, {
          id: { in: selection.pinnedIds },
        }),
        hasNextPage: selection.hasNextPage,
      };
    }
    const pinnedItems = await this.pinnedRows(transaction, input);
    const rows = await this.rows(
      transaction,
      input,
      0,
      input.first + 1,
      input.cursor,
      { id: { notIn: pinnedItems.map(({ id }) => id) } },
    );
    return {
      items: rows.slice(0, input.first),
      pinnedItems,
      hasNextPage: rows.length > input.first,
    };
  }

  async browseShortNumbered(
    transaction: Prisma.TransactionClient,
    input: ShortNewsNumberedQuery,
  ) {
    if (input.search) {
      const selection = await this.search.select(transaction, input);
      return {
        items: await this.rows(
          transaction,
          input,
          0,
          input.pageSize,
          undefined,
          { id: { in: selection.itemIds } },
        ),
        pinnedItems: await this.rows(transaction, input, 0, 20, undefined, {
          id: { in: selection.pinnedIds },
        }),
        total: selection.total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(selection.total / input.pageSize),
      };
    }
    const pinnedItems = await this.pinnedRows(transaction, input);
    const ids = pinnedItems.map(({ id }) => id);
    const items = await this.rows(
      transaction,
      input,
      (input.page - 1) * input.pageSize,
      input.pageSize,
      undefined,
      { id: { notIn: ids } },
    );
    const total = await transaction.newsArticle.count({
      where: { ...this.where(input), id: { notIn: ids } },
    });
    return {
      items,
      pinnedItems,
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }

  async chronologicalNavigation(
    transaction: Prisma.TransactionClient,
    articleId: string,
  ): Promise<NewsChronologicalNavigation> {
    const current = await transaction.newsArticle.findFirst({
      where: { id: articleId, status: 'PUBLISHED', publishedAt: { not: null } },
      select: { id: true, language: true, publishedAt: true },
    });
    if (!current?.publishedAt) return { previous: null, next: null };
    const base = {
      status: 'PUBLISHED' as const,
      visibility: 'PUBLIC' as const,
      language: current.language,
      publishedAt: { not: null },
    };
    const select = {
      id: true,
      language: true,
      slug: true,
      title: true,
      coverMediaId: true,
      publishedAt: true,
      displayPublishedAt: true,
    } as const;
    const [previous, next] = await Promise.all([
      transaction.newsArticle.findFirst({
        where: {
          ...base,
          OR: [
            { publishedAt: { lt: current.publishedAt } },
            { publishedAt: current.publishedAt, id: { lt: current.id } },
          ],
        },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        select,
      }),
      transaction.newsArticle.findFirst({
        where: {
          ...base,
          OR: [
            { publishedAt: { gt: current.publishedAt } },
            { publishedAt: current.publishedAt, id: { gt: current.id } },
          ],
        },
        orderBy: [{ publishedAt: 'asc' }, { id: 'asc' }],
        select,
      }),
    ]);
    return { previous: this.toNeighbor(previous), next: this.toNeighbor(next) };
  }

  async findFullBySlug(
    transaction: Prisma.TransactionClient,
    language: string,
    slug: string,
    viewerId?: string,
  ): Promise<NewsFullContent | null> {
    const short = (
      await this.rows(transaction, { language, viewerId }, 0, 1, undefined, {
        slug,
      })
    ).at(0);
    if (!short) return null;
    const article = await transaction.newsArticle.findUnique({
      where: { id: short.id },
      select: {
        document: true,
        templateData: true,
        allowComments: true,
        allowRating: true,
        allowSharing: true,
        allowIndexing: true,
        outgoingLinks: {
          where: { targetArticle: this.where({ viewerId }) },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            type: true,
            anchorText: true,
            targetArticle: {
              select: {
                language: true,
                slug: true,
                title: true,
                shortText: true,
                coverMediaId: true,
                displayPublishedAt: true,
                publishedAt: true,
              },
            },
          },
        },
      },
    });
    if (!article) return null;
    return {
      ...short,
      documentJson: JSON.stringify(article.document),
      templateDataJson: JSON.stringify(article.templateData),
      allowComments: article.allowComments,
      allowRating: article.allowRating,
      allowSharing: article.allowSharing,
      allowIndexing: article.allowIndexing,
      related: article.outgoingLinks.flatMap((link) => {
        const date =
          link.targetArticle.displayPublishedAt ??
          link.targetArticle.publishedAt;
        return date
          ? [
              {
                id: link.id,
                type: link.type,
                anchorText: link.anchorText,
                language: link.targetArticle.language,
                slug: link.targetArticle.slug,
                title: link.targetArticle.title,
                shortText: link.targetArticle.shortText,
                coverMediaId: link.targetArticle.coverMediaId,
                displayPublishedAt: date,
              },
            ]
          : [];
      }),
    };
  }

  eligibleTarget(
    transaction: Prisma.TransactionClient,
    articleId: string,
    capability: 'comments' | 'rating',
    viewerId?: string,
  ) {
    return transaction.newsArticle.findFirst({
      where: {
        ...this.where({ viewerId }),
        id: articleId,
        ...(capability === 'comments'
          ? { allowComments: true }
          : { allowRating: true }),
      },
      select: { interactionTargetId: true },
    });
  }

  private where(
    input: SharedQuery,
    cursor?: ShortNewsQuery['cursor'],
  ): Prisma.NewsArticleWhereInput {
    return {
      status: 'PUBLISHED',
      publishedAt: { not: null },
      visibility: { in: input.viewerId ? ['PUBLIC', 'MEMBERS'] : ['PUBLIC'] },
      ...(input.language ? { language: input.language } : {}),
      ...(input.postType ? { postType: input.postType } : {}),
      ...(input.featured === undefined ? {} : { featured: input.featured }),
      ...(input.homepage === undefined
        ? {}
        : { showOnHomepage: input.homepage }),
      ...(input.categorySlug
        ? {
            categories: {
              some: { category: { slug: input.categorySlug, isActive: true } },
            },
          }
        : {}),
      ...(input.tagSlug
        ? { tags: { some: { tag: { slug: input.tagSlug } } } }
        : {}),
      AND: [
        ...(cursor
          ? [
              {
                OR: [
                  { publishedAt: { lt: cursor.publishedAt } },
                  { publishedAt: cursor.publishedAt, id: { lt: cursor.id } },
                ],
              },
            ]
          : []),
      ],
    };
  }

  private async rows(
    transaction: Prisma.TransactionClient,
    input: SharedQuery,
    skip: number,
    take: number,
    cursor?: ShortNewsQuery['cursor'],
    extraWhere?: Prisma.NewsArticleWhereInput,
  ): Promise<NewsDeliveryContent[]> {
    const rows = await transaction.newsArticle.findMany({
      where: { ...this.where(input, cursor), ...extraWhere },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        interactionTargetId: true,
        authorId: true,
        postType: true,
        visibility: true,
        language: true,
        slug: true,
        title: true,
        shortText: true,
        coverMediaId: true,
        publishedAt: true,
        displayPublishedAt: true,
        featured: true,
        pin: { select: { scope: true, categoryId: true, expiresAt: true } },
        categories: {
          where: { isPrimary: true, category: { isActive: true } },
          take: 1,
          select: {
            category: {
              select: { id: true, name: true, slug: true, icon: true },
            },
          },
        },
        tags: {
          orderBy: { tag: { name: 'asc' } },
          select: { tag: { select: { id: true, name: true, slug: true } } },
        },
      },
    });
    return rows.map(
      ({ categories, tags, publishedAt, displayPublishedAt, ...row }) => {
        if (!publishedAt)
          throw new Error('Published News is missing its publication time.');
        return {
          ...row,
          publishedAt,
          displayPublishedAt: displayPublishedAt ?? publishedAt,
          primaryCategory: categories.at(0)?.category ?? null,
          tags: tags.map(({ tag }) => tag),
        };
      },
    );
  }

  private pinnedRows(
    transaction: Prisma.TransactionClient,
    input: SharedQuery,
  ) {
    const now = new Date();
    return this.rows(transaction, input, 0, 20, undefined, {
      pin: {
        is: {
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            {
              OR: [
                { scope: 'GLOBAL' },
                ...(input.categorySlug
                  ? [
                      {
                        scope: 'CATEGORY' as const,
                        category: { slug: input.categorySlug, isActive: true },
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
      },
    });
  }

  private toNeighbor(
    article: {
      id: string;
      language: string;
      slug: string;
      title: string;
      coverMediaId: string | null;
      publishedAt: Date | null;
      displayPublishedAt: Date | null;
    } | null,
  ): NewsChronologicalNeighbor | null {
    if (!article?.publishedAt) return null;
    return {
      id: article.id,
      language: article.language,
      slug: article.slug,
      title: article.title,
      coverMediaId: article.coverMediaId,
      displayPublishedAt: article.displayPublishedAt ?? article.publishedAt,
    };
  }
}
