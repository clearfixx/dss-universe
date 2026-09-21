import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@api/core/database';
import type { NewsDeliveryRepository } from '../../domain/repositories/news-delivery.repository.interface';
import type {
  NewsChronologicalNavigation,
  NewsChronologicalNeighbor,
} from '../../domain/types/news-links.type';
import type {
  ShortNewsItem,
  ShortNewsNumberedPage,
  ShortNewsNumberedQuery,
  ShortNewsPage,
  ShortNewsQuery,
} from '../../domain/types/short-news.type';

type SharedQuery = Omit<ShortNewsQuery, 'first' | 'cursor'>;

@Injectable()
export class PrismaNewsDeliveryRepository implements NewsDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async browseShort(input: ShortNewsQuery): Promise<ShortNewsPage> {
    const rows = await this.rows(input, 0, input.first + 1, input.cursor);
    return {
      items: this.toItems(rows.slice(0, input.first)),
      hasNextPage: rows.length > input.first,
    };
  }

  async browseShortNumbered(
    input: ShortNewsNumberedQuery,
  ): Promise<ShortNewsNumberedPage> {
    const [rows, total] = await this.prisma.$transaction([
      this.rows(input, (input.page - 1) * input.pageSize, input.pageSize),
      this.prisma.newsArticle.count({ where: this.where(input) }),
    ]);
    return {
      items: this.toItems(rows),
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }

  async chronologicalNavigation(
    articleId: string,
  ): Promise<NewsChronologicalNavigation> {
    const current = await this.prisma.newsArticle.findFirst({
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
      this.prisma.newsArticle.findFirst({
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
      this.prisma.newsArticle.findFirst({
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
    return {
      previous: this.toNeighbor(previous),
      next: this.toNeighbor(next),
    };
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
              some: {
                category: { slug: input.categorySlug, isActive: true },
              },
            },
          }
        : {}),
      ...(input.tagSlug
        ? { tags: { some: { tag: { slug: input.tagSlug } } } }
        : {}),
      AND: [
        ...(input.search
          ? [
              {
                OR: [
                  {
                    title: {
                      contains: input.search,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    shortText: {
                      contains: input.search,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    searchText: {
                      contains: input.search,
                      mode: 'insensitive' as const,
                    },
                  },
                ],
              },
            ]
          : []),
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

  private rows(
    input: SharedQuery,
    skip: number,
    take: number,
    cursor?: ShortNewsQuery['cursor'],
  ) {
    return this.prisma.newsArticle.findMany({
      where: this.where(input, cursor),
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        interactionTargetId: true,
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
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            avatarMediaId: true,
          },
        },
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
        interactionTarget: {
          select: {
            reactionAggregate: {
              select: { upvotes: true, downvotes: true, score: true },
            },
            bookmarks: {
              where: input.viewerId ? { ownerId: input.viewerId } : { id: '' },
              take: 1,
              select: { id: true },
            },
            _count: {
              select: { comments: { where: { deletedAt: null } } },
            },
          },
        },
      },
    });
  }

  private toItems(
    rows: Awaited<ReturnType<PrismaNewsDeliveryRepository['rows']>>,
  ): ShortNewsItem[] {
    return rows.map((row) => {
      const publishedAt = row.publishedAt;
      if (!publishedAt) {
        throw new Error('Published News is missing its publication time.');
      }
      return {
        id: row.id,
        interactionTargetId: row.interactionTargetId,
        postType: row.postType,
        visibility: row.visibility,
        language: row.language,
        slug: row.slug,
        title: row.title,
        shortText: row.shortText,
        coverMediaId: row.coverMediaId,
        publishedAt,
        displayPublishedAt: row.displayPublishedAt ?? publishedAt,
        featured: row.featured,
        author: row.author,
        primaryCategory: row.categories.at(0)?.category ?? null,
        tags: row.tags.map(({ tag }) => tag),
        engagement: {
          viewCount: null,
          commentCount: row.interactionTarget._count.comments,
          upvotes: row.interactionTarget.reactionAggregate?.upvotes ?? 0,
          downvotes: row.interactionTarget.reactionAggregate?.downvotes ?? 0,
          score: row.interactionTarget.reactionAggregate?.score ?? 0,
          bookmarkedByViewer: row.interactionTarget.bookmarks.length === 1,
        },
      };
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
