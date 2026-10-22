/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/news-delivery.graphql.ts
 *
 * 🎯 Purpose:
 * Maps existing News delivery contracts to GraphQL with optional authenticated viewer context.
 *
 * 🧠 Responsibilities:
 * • delegates existing delivery queries through transport-owned types;
 * • forwards verified viewer identity to audience-aware delivery operations;
 * • preserves guest fallback without granting membership for invalid credentials.
 *
 * 🏗️ Architecture:
 * Delivery resolver boundary; business policy and persistence remain outside GraphQL.
 *
 * ⚠️ Important:
 * Article eligibility is authoritative in News. Transport context is not a staff bypass.
 * The legacy non-null tombstone body mismatch remains separately tracked as DEBT-057.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { UseGuards } from '@nestjs/common';
import { Args, Context, ID, Int, Query, Resolver } from '@nestjs/graphql';
import type { AuthenticatedUser } from '@api/core/auth';
import { NewsDeliveryService } from '../../application/services/news-delivery.service';
import { NewsSettingsService } from '../../application/services/news-settings.service';
import type { FullNewsItem } from '../../domain/types/short-news.type';
import type { NewsChronologicalNavigation } from '../../domain/types/news-links.type';
import { OptionalNewsJwtGuard } from './guards/optional-news-jwt.guard';
import { NewsBrowseInput } from './inputs/news-browse.input';
import {
  ShortNewsModel,
  NumberedNewsPageModel,
  FullNewsModel,
  NewsNavigationModel,
  NewsRatingVotePageModel,
  NewsCommentsPageModel,
} from './models/news-delivery.model';

@Resolver(() => ShortNewsModel)
@UseGuards(OptionalNewsJwtGuard)
export class NewsDeliveryResolver {
  constructor(
    private readonly delivery: NewsDeliveryService,
    private readonly settings: NewsSettingsService,
  ) {}

  @Query(() => NumberedNewsPageModel)
  async news(
    @Context() context: { req: { user?: AuthenticatedUser } },
    @Args('input', { nullable: true }) input?: NewsBrowseInput,
  ) {
    const settings = await this.settings.settings();
    return this.delivery.browseNumbered(
      {
        ...input,
        pageSize: input?.pageSize ?? settings.newsPageSize,
        postType: input?.postType,
      },
      context.req.user?.id,
    );
  }

  @Query(() => FullNewsModel, { nullable: true })
  fullNews(
    @Context() context: { req: { user?: AuthenticatedUser } },
    @Args('language') language: string,
    @Args('slug') slug: string,
  ): Promise<FullNewsItem | null> {
    return this.delivery.fullBySlug(language, slug, context.req.user?.id);
  }

  @Query(() => NewsNavigationModel)
  newsNavigation(
    @Args('articleId', { type: () => ID }) articleId: string,
  ): Promise<NewsChronologicalNavigation> {
    return this.delivery.navigation(articleId);
  }

  @Query(() => NewsRatingVotePageModel)
  newsRatingVotes(
    @Context() context: { req: { user?: AuthenticatedUser } },
    @Args('articleId', { type: () => ID }) articleId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 20 }) pageSize: number,
  ): ReturnType<NewsDeliveryService['ratingVotes']> {
    return this.delivery.ratingVotes(
      articleId,
      page,
      pageSize,
      context.req.user?.id,
    );
  }

  @Query(() => NewsCommentsPageModel)
  async newsComments(
    @Context() context: { req: { user?: AuthenticatedUser } },
    @Args('articleId', { type: () => ID }) articleId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, nullable: true }) pageSize?: number,
  ) {
    const settings = await this.settings.settings();
    return this.delivery.comments(
      articleId,
      page,
      pageSize ?? settings.commentsPageSize,
      context.req.user?.id,
    );
  }
}
