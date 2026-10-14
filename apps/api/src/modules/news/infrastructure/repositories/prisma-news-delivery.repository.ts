/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/infrastructure/repositories/prisma-news-delivery.repository.ts
 *
 * 🎯 Purpose:
 * Reads owned News delivery data while legacy Users/Interactions projections remain explicit debt.
 *
 * 🧠 Responsibilities:
 * • retains News filtering, pinned/cursor/numbered reads and full article data;
 * • applies current article eligibility to related metadata, comments and votes;
 * • preserves existing rating/comment transactional projections pending their transfer.
 *
 * 🏗️ Architecture:
 * Transitional News infrastructure; application composes public attachment metadata via owned ports.
 *
 * ⚠️ Important:
 * No Media query belongs here; remaining author/interaction joins are not full ownership acceptance.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma, ReactionKind } from '@prisma/client';

import { PrismaService } from '@api/core/database';
import { PrismaNewsSearchSession } from './prisma-news-search.session';
import type { NewsDeliveryRepository } from '../../domain/repositories/news-delivery.repository.interface';
import type { NewsFullRecord } from '../../domain/types/news-full-record.type';
import type {
  NewsChronologicalNavigation,
  NewsChronologicalNeighbor,
} from '../../domain/types/news-links.type';
import type {
  NewsCommentItem,
  NewsCommentsPage,
} from '../../domain/types/news-comment.type';
import type {
  NewsRatingVote,
  ShortNewsItem,
  ShortNewsNumberedPage,
  ShortNewsNumberedQuery,
  ShortNewsPage,
  ShortNewsQuery,
} from '../../domain/types/short-news.type';

const SHARE_CHANNELS = [
  'FACEBOOK',
  'X',
  'THREADS',
  'INSTAGRAM',
  'PINTEREST',
  'COPY_LINK',
  'PRINT',
] as const;

type SharedQuery = Omit<ShortNewsQuery, 'first' | 'cursor'>;

@Injectable()
export class PrismaNewsDeliveryRepository implements NewsDeliveryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: PrismaNewsSearchSession,
  ) {}

  async browseShort(input: ShortNewsQuery): Promise<ShortNewsPage> {
    if (input.search) {
      return this.search.run(input, async (transaction, selection) => ({
        items: this.toItems(
          await this.rows(
            input,
            0,
            input.first,
            undefined,
            { id: { in: selection.itemIds } },
            transaction,
          ),
        ),
        pinnedItems: this.toItems(
          await this.rows(
            input,
            0,
            20,
            undefined,
            { id: { in: selection.pinnedIds } },
            transaction,
          ),
        ),
        hasNextPage: selection.hasNextPage,
      }));
    }
    const pinnedRows = await this.pinnedRows(input);
    const pinnedIds = pinnedRows.map(({ id }) => id);
    const rows = await this.rows(input, 0, input.first + 1, input.cursor, {
      id: { notIn: pinnedIds },
    });
    return {
      items: this.toItems(rows.slice(0, input.first)),
      pinnedItems: this.toItems(pinnedRows),
      hasNextPage: rows.length > input.first,
    };
  }

  async browseShortNumbered(
    input: ShortNewsNumberedQuery,
  ): Promise<ShortNewsNumberedPage> {
    if (input.search) {
      return this.search.run(input, async (transaction, selection) => ({
        items: this.toItems(
          await this.rows(
            input,
            0,
            input.pageSize,
            undefined,
            { id: { in: selection.itemIds } },
            transaction,
          ),
        ),
        pinnedItems: this.toItems(
          await this.rows(
            input,
            0,
            20,
            undefined,
            { id: { in: selection.pinnedIds } },
            transaction,
          ),
        ),
        total: selection.total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(selection.total / input.pageSize),
      }));
    }
    const pinnedRows = await this.pinnedRows(input);
    const pinnedIds = pinnedRows.map(({ id }) => id);
    const unpinnedWhere = { ...this.where(input), id: { notIn: pinnedIds } };
    const [rows, total] = await this.prisma.$transaction([
      this.rows(
        input,
        (input.page - 1) * input.pageSize,
        input.pageSize,
        undefined,
        {
          id: { notIn: pinnedIds },
        },
      ),
      this.prisma.newsArticle.count({ where: unpinnedWhere }),
    ]);
    return {
      items: this.toItems(rows),
      pinnedItems: this.toItems(pinnedRows),
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

  async findFullBySlug(
    language: string,
    slug: string,
    viewerId?: string,
  ): Promise<NewsFullRecord | null> {
    const rows = await this.rows({ language, viewerId }, 0, 1, undefined, {
      slug,
    });
    const short = this.toItems(rows).at(0);
    if (!short) return null;
    const article = await this.prisma.newsArticle.findUnique({
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
    const shareGroups = await this.prisma.interactionShare.groupBy({
      by: ['channel'],
      where: { interactionTargetId: short.interactionTargetId },
      _count: { _all: true },
    });
    const shareCounts = new Map(
      shareGroups.map((group) => [group.channel, group._count._all]),
    );
    return {
      ...short,
      documentJson: JSON.stringify(article.document),
      templateDataJson: JSON.stringify(article.templateData),
      allowComments: article.allowComments,
      allowRating: article.allowRating,
      allowSharing: article.allowSharing,
      allowIndexing: article.allowIndexing,
      sharing: {
        total: shareGroups.reduce(
          (total, group) => total + group._count._all,
          0,
        ),
        channels: SHARE_CHANNELS.map((channel) => ({
          channel,
          count: shareCounts.get(channel) ?? 0,
        })),
      },
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

  async ratingVotes(
    articleId: string,
    page: number,
    pageSize: number,
    viewerId?: string,
  ): Promise<{
    items: NewsRatingVote[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const article = await this.prisma.newsArticle.findFirst({
      where: { ...this.where({ viewerId }), id: articleId, allowRating: true },
      select: { interactionTargetId: true },
    });
    if (!article) return { items: [], total: 0, page, pageSize, totalPages: 0 };
    const where = {
      interactionTargetId: article.interactionTargetId,
      kind: { in: [ReactionKind.UPVOTE, ReactionKind.DOWNVOTE] },
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.reaction.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          kind: true,
          updatedAt: true,
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.reaction.count({ where }),
    ]);
    return {
      items: rows as NewsRatingVote[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async comments(
    articleId: string,
    page: number,
    pageSize: number,
    viewerId?: string,
  ): Promise<NewsCommentsPage> {
    const article = await this.prisma.newsArticle.findFirst({
      where: {
        ...this.where({ viewerId }),
        id: articleId,
        allowComments: true,
      },
      select: { interactionTargetId: true },
    });
    if (!article) return { items: [], total: 0, page, pageSize, totalPages: 0 };

    const commentWhere = { interactionTargetId: article.interactionTargetId };
    const [roots, total, rows] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: { ...commentWhere, parentId: null },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true },
      }),
      this.prisma.comment.count({
        where: { ...commentWhere, parentId: null },
      }),
      this.prisma.comment.findMany({
        where: commentWhere,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          reactionTargetId: true,
          parentId: true,
          body: true,
          document: true,
          deletedAt: true,
          editedAt: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          reactionTarget: {
            select: {
              reactionAggregate: {
                select: { upvotes: true, downvotes: true, score: true },
              },
              reactions: viewerId
                ? {
                    where: {
                      actorId: viewerId,
                      kind: {
                        in: [ReactionKind.UPVOTE, ReactionKind.DOWNVOTE],
                      },
                    },
                    select: { kind: true },
                    take: 1,
                  }
                : false,
            },
          },
        },
      }),
    ]);

    const nodes = new Map<string, NewsCommentItem>();
    for (const row of rows) {
      const aggregate = row.reactionTarget.reactionAggregate;
      const viewerReaction = row.reactionTarget.reactions?.at(0)?.kind;
      nodes.set(row.id, {
        id: row.id,
        reactionTargetId: row.reactionTargetId,
        parentId: row.parentId,
        body: row.body,
        documentJson: JSON.stringify(row.document),
        isDeleted: Boolean(row.deletedAt),
        editedAt: row.editedAt,
        createdAt: row.createdAt,
        author: row.author,
        engagement: {
          upvotes: aggregate?.upvotes ?? 0,
          downvotes: aggregate?.downvotes ?? 0,
          score: aggregate?.score ?? 0,
          viewerReaction:
            viewerReaction === ReactionKind.UPVOTE
              ? 'UPVOTE'
              : viewerReaction === ReactionKind.DOWNVOTE
                ? 'DOWNVOTE'
                : null,
        },
        children: [],
      });
    }
    for (const node of nodes.values()) {
      if (node.parentId) nodes.get(node.parentId)?.children.push(node);
    }
    return {
      items: roots.flatMap(({ id }) => {
        const root = nodes.get(id);
        return root ? [root] : [];
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
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
    extraWhere?: Prisma.NewsArticleWhereInput,
    client?: Prisma.TransactionClient,
  ) {
    return (client?.newsArticle ?? this.prisma.newsArticle).findMany({
      where: { ...this.where(input, cursor), ...extraWhere },
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
        pin: {
          select: { scope: true, categoryId: true, expiresAt: true },
        },
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
            reactions: {
              where: input.viewerId
                ? {
                    actorId: input.viewerId,
                    kind: { in: ['UPVOTE', 'DOWNVOTE'] },
                  }
                : { id: '' },
              take: 1,
              select: { kind: true },
            },
            _count: {
              select: {
                comments: { where: { deletedAt: null } },
                views: true,
              },
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
        pin: row.pin,
        author: row.author,
        primaryCategory: row.categories.at(0)?.category ?? null,
        tags: row.tags.map(({ tag }) => tag),
        engagement: {
          viewCount: row.interactionTarget._count.views,
          commentCount: row.interactionTarget._count.comments,
          upvotes: row.interactionTarget.reactionAggregate?.upvotes ?? 0,
          downvotes: row.interactionTarget.reactionAggregate?.downvotes ?? 0,
          score: row.interactionTarget.reactionAggregate?.score ?? 0,
          bookmarkedByViewer: row.interactionTarget.bookmarks.length === 1,
          viewerReaction: (() => {
            const kind = row.interactionTarget.reactions.at(0)?.kind;
            return kind === 'UPVOTE' || kind === 'DOWNVOTE' ? kind : null;
          })(),
        },
      };
    });
  }

  private pinnedRows(input: SharedQuery) {
    const now = new Date();
    return this.rows(input, 0, 20, undefined, {
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
