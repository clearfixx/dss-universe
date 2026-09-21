import { Injectable } from '@nestjs/common';

import { PrismaService } from '@api/core/database';
import type { NewsDeliveryRepository } from '../../domain/repositories/news-delivery.repository.interface';
import type {
  ShortNewsItem,
  ShortNewsPage,
  ShortNewsQuery,
} from '../../domain/types/short-news.type';

@Injectable()
export class PrismaNewsDeliveryRepository implements NewsDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async browseShort(input: ShortNewsQuery): Promise<ShortNewsPage> {
    const rows = await this.prisma.newsArticle.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { not: null },
        visibility: {
          in: input.viewerId ? ['PUBLIC', 'MEMBERS'] : ['PUBLIC'],
        },
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
        ...(input.search
          ? {
              OR: [
                { title: { contains: input.search, mode: 'insensitive' } },
                { shortText: { contains: input.search, mode: 'insensitive' } },
                { searchText: { contains: input.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(input.cursor
          ? {
              OR: [
                { publishedAt: { lt: input.cursor.publishedAt } },
                {
                  publishedAt: input.cursor.publishedAt,
                  id: { lt: input.cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: input.first + 1,
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
          select: {
            tag: { select: { id: true, name: true, slug: true } },
          },
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
    const hasNextPage = rows.length > input.first;
    return {
      items: rows.slice(0, input.first).map((row): ShortNewsItem => {
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
      }),
      hasNextPage,
    };
  }
}
