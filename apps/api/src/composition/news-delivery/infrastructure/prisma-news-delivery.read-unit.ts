/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Delivery Composition
 * 📄 File: apps/api/src/composition/news-delivery/infrastructure/prisma-news-delivery.read-unit.ts
 *
 * 🎯 Purpose:
 * Composes owned News, Users and Interactions projections in one explicit read snapshot.
 *
 * 🧠 Responsibilities:
 * • opens scoped Repeatable Read for composed delivery operations;
 * • batches display and engagement hydration without foreign SQL or default evidence;
 * • propagates owner failures and preserves semantic delivery responses.
 *
 * 🏗️ Architecture:
 * Root infrastructure unit of work implementing the News-owned semantic read port.
 *
 * ⚠️ Important:
 * ORM callbacks never enter business contracts. No new global isolation or timeout.
 * Live search access evidence and application document/media projections keep their own boundaries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import type {
  NewsDeliveryReader,
  ShortNewsQuery,
  ShortNewsNumberedQuery,
  ShortNewsItem,
  NewsCommentsPage,
  NewsCommentItem,
  NewsFullRecord,
  NewsRatingVote,
} from '@api/modules/news';
import {
  PrismaNewsDeliveryRepository,
  type NewsDeliveryContent,
} from '@api/modules/news/infrastructure';
import { PrismaPublicProfileReader } from '@api/modules/users/infrastructure';
import {
  PrismaInteractionDeliveryReader,
  type InteractionDeliveryComment,
} from '@api/modules/interactions/infrastructure';

const SNAPSHOT = {
  isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
} as const;
type Profiles = Awaited<ReturnType<PrismaPublicProfileReader['read']>>;

@Injectable()
export class PrismaNewsDeliveryReadUnit implements NewsDeliveryReader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly news: PrismaNewsDeliveryRepository,
    private readonly profiles: PrismaPublicProfileReader,
    private readonly interactions: PrismaInteractionDeliveryReader,
  ) {}

  browseShort(input: ShortNewsQuery) {
    return this.prisma.$transaction(async (transaction) => {
      const page = await this.news.browseShort(transaction, input);
      const items = await this.hydrate(
        transaction,
        [...page.items, ...page.pinnedItems],
        input.viewerId,
      );
      return {
        items: items.slice(0, page.items.length),
        pinnedItems: items.slice(page.items.length),
        hasNextPage: page.hasNextPage,
      };
    }, SNAPSHOT);
  }

  browseShortNumbered(input: ShortNewsNumberedQuery) {
    return this.prisma.$transaction(async (transaction) => {
      const page = await this.news.browseShortNumbered(transaction, input);
      const items = await this.hydrate(
        transaction,
        [...page.items, ...page.pinnedItems],
        input.viewerId,
      );
      return {
        ...page,
        items: items.slice(0, page.items.length),
        pinnedItems: items.slice(page.items.length),
      };
    }, SNAPSHOT);
  }

  chronologicalNavigation(articleId: string) {
    // News-only navigation retains its existing independent-read policy.
    return this.news.chronologicalNavigation(this.prisma, articleId);
  }

  findFullBySlug(
    language: string,
    slug: string,
    viewerId?: string,
  ): Promise<NewsFullRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const content = await this.news.findFullBySlug(
        transaction,
        language,
        slug,
        viewerId,
      );
      if (!content) return null;
      const [short] = await this.hydrate(transaction, [content], viewerId);
      const sharing = await this.interactions.shares(
        transaction,
        content.interactionTargetId,
      );
      return {
        ...short,
        documentJson: content.documentJson,
        templateDataJson: content.templateDataJson,
        allowComments: content.allowComments,
        allowRating: content.allowRating,
        allowSharing: content.allowSharing,
        allowIndexing: content.allowIndexing,
        related: content.related,
        sharing,
      };
    }, SNAPSHOT);
  }

  ratingVotes(
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
    return this.prisma.$transaction(async (transaction) => {
      const article = await this.news.eligibleTarget(
        transaction,
        articleId,
        'rating',
        viewerId,
      );
      if (!article)
        return { items: [], total: 0, page, pageSize, totalPages: 0 };
      const result = await this.interactions.ratingPage(
        transaction,
        article.interactionTargetId,
        page,
        pageSize,
      );
      const profiles = await this.profiles.read(
        transaction,
        result.items.map(({ actorId }) => actorId),
      );
      return {
        ...result,
        items: result.items.map(({ actorId, ...vote }) => ({
          ...vote,
          actor: this.actor(profiles, actorId),
        })),
      };
    }, SNAPSHOT);
  }

  comments(
    articleId: string,
    page: number,
    pageSize: number,
    viewerId?: string,
  ): Promise<NewsCommentsPage> {
    return this.prisma.$transaction(async (transaction) => {
      const article = await this.news.eligibleTarget(
        transaction,
        articleId,
        'comments',
        viewerId,
      );
      if (!article)
        return { items: [], total: 0, page, pageSize, totalPages: 0 };
      const result = await this.interactions.commentsPage(
        transaction,
        article.interactionTargetId,
        page,
        pageSize,
        viewerId,
      );
      const ids: string[] = [];
      const collect = (nodes: InteractionDeliveryComment[]) => {
        for (const node of nodes) {
          ids.push(node.authorId);
          collect(node.children);
        }
      };
      collect(result.items);
      const profiles = await this.profiles.read(transaction, ids);
      const compose = ({
        authorId,
        children,
        ...node
      }: InteractionDeliveryComment): NewsCommentItem => ({
        ...node,
        author: this.actor(profiles, authorId),
        children: children.map(compose),
      });
      return { ...result, items: result.items.map(compose) };
    }, SNAPSHOT);
  }

  private async hydrate(
    transaction: Prisma.TransactionClient,
    content: NewsDeliveryContent[],
    viewerId?: string,
  ): Promise<ShortNewsItem[]> {
    if (!content.length) return [];
    const profiles = await this.profiles.read(
      transaction,
      content.map(({ authorId }) => authorId),
    );
    const engagements = await this.interactions.summaries(
      transaction,
      content.map(({ interactionTargetId }) => interactionTargetId),
      viewerId,
    );
    return content.map(({ authorId, ...row }) => {
      const author = profiles.get(authorId);
      const engagement = engagements.get(row.interactionTargetId);
      if (!author || !engagement)
        throw new Error('News delivery owner evidence is incomplete.');
      return { ...row, author, engagement };
    });
  }

  private actor(profiles: Profiles, id: string): NewsRatingVote['actor'] {
    const profile = profiles.get(id);
    if (!profile)
      throw new Error('News delivery actor evidence is incomplete.');
    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    };
  }
}

/**
 * One response, one snapshot. Even astronauts deserve matching timestamps. 🛰️
 */
