import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { Permission, PermissionsService } from '@api/core/authorization';
import { NewsService } from '../../application/services/news.service';
import { NewsWorkflowService } from '../../application/services/news-workflow.service';
import type { NewsArticle } from '../../domain/types/news-article.type';
import type {
  NewsEditorialDecision,
  NewsEditorialTransitionResult,
} from '../../domain/types/news-editorial.type';
import {
  NewsPostTypeModel,
  NewsVisibilityModel,
} from './models/news-delivery.enums';
import {
  NewsArticleStatusModel,
  NewsEditorialActionModel,
} from './models/news-editorial.enums';
import {
  NewsEditorialArticleModel,
  NewsEditorialDecisionModel,
  NewsEditorialTransitionModel,
  NewsEditorialPageModel,
} from './models/news-editorial.model';
import {
  NewsEditorialBrowseInput,
  CreateNewsDraftInput,
  SaveNewsDraftInput,
  NewsDecisionInput,
  ScheduleNewsInput,
  PublishNewsInput,
} from './inputs/news-editorial.input';

@Resolver(() => NewsEditorialArticleModel)
@UseGuards(JwtAuthGuard)
export class NewsEditorialResolver {
  constructor(
    private readonly news: NewsService,
    private readonly workflow: NewsWorkflowService,
    private readonly permissions: PermissionsService,
  ) {}

  @Query(() => NewsEditorialPageModel)
  async editorialNews(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input', { nullable: true }) input?: NewsEditorialBrowseInput,
  ): Promise<NewsEditorialPageModel> {
    const profile = await this.permissions.getAccessProfileByUserId(actor.id);
    const includeAll =
      profile.permissions.includes(Permission.NewsReview) ||
      profile.permissions.includes(Permission.NewsPublish);
    const result = await this.news.listEditorial({
      actorId: actor.id,
      includeAll,
      statuses: input?.statuses,
      page: input?.page ?? 1,
      pageSize: input?.pageSize ?? 20,
    });
    return {
      ...result,
      items: result.items.map((item) => this.toArticle(item)),
    };
  }

  @Query(() => NewsEditorialArticleModel)
  async newsEditorialArticle(
    @AuthUser() actor: AuthenticatedUser,
    @Args('articleId', { type: () => ID }) articleId: string,
  ): Promise<NewsEditorialArticleModel> {
    const article = await this.news.findById(articleId);
    if (!article) throw new NotFoundException('News article was not found.');
    await this.assertCanReadEditorial(actor.id, article);
    return this.toArticle(article);
  }

  @Mutation(() => NewsEditorialArticleModel)
  async createNewsDraft(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: CreateNewsDraftInput,
  ): Promise<NewsEditorialArticleModel> {
    const article = await this.news.createDraft({
      authorId: actor.id,
      postType: input.postType,
      visibility: input.visibility,
      language: input.language,
      slug: input.slug,
      title: input.title,
      shortText: input.shortText,
      documentJson: input.documentJson,
      templateData: this.parseTemplate(input.templateDataJson),
      coverMediaId: input.coverMediaId ?? null,
    });
    return this.toArticle(article);
  }

  @Mutation(() => NewsEditorialArticleModel)
  async saveNewsDraft(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: SaveNewsDraftInput,
  ): Promise<NewsEditorialArticleModel> {
    const article = await this.news.saveDraft(actor.id, {
      articleId: input.articleId,
      baseVersion: input.baseVersion,
      changeSummary: input.changeSummary ?? null,
      postType: input.postType,
      visibility: input.visibility,
      language: input.language,
      slug: input.slug,
      title: input.title,
      shortText: input.shortText,
      documentJson: input.documentJson,
      templateData: this.parseTemplate(input.templateDataJson),
      coverMediaId: input.coverMediaId ?? null,
    });
    return this.toArticle(article);
  }

  @Mutation(() => NewsEditorialTransitionModel)
  async submitNewsForReview(
    @AuthUser() actor: AuthenticatedUser,
    @Args('articleId', { type: () => ID }) articleId: string,
  ): Promise<NewsEditorialTransitionModel> {
    return this.toTransition(await this.workflow.submit(actor.id, articleId));
  }

  @Mutation(() => NewsEditorialTransitionModel)
  async requestNewsChanges(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: NewsDecisionInput,
  ): Promise<NewsEditorialTransitionModel> {
    return this.toTransition(
      await this.workflow.requestChanges(
        actor.id,
        input.articleId,
        input.reason ?? '',
      ),
    );
  }

  @Mutation(() => NewsEditorialTransitionModel)
  async approveNews(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: NewsDecisionInput,
  ): Promise<NewsEditorialTransitionModel> {
    return this.toTransition(
      await this.workflow.approve(actor.id, input.articleId, input.reason),
    );
  }

  @Mutation(() => NewsEditorialTransitionModel)
  async publishNews(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: PublishNewsInput,
  ): Promise<NewsEditorialTransitionModel> {
    return this.toTransition(
      await this.workflow.publish(
        actor.id,
        input.articleId,
        input.displayPublishedAt,
      ),
    );
  }

  @Mutation(() => NewsEditorialTransitionModel)
  async scheduleNews(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: ScheduleNewsInput,
  ): Promise<NewsEditorialTransitionModel> {
    return this.toTransition(
      await this.workflow.schedule(
        actor.id,
        input.articleId,
        input.scheduledFor,
        input.displayPublishedAt,
      ),
    );
  }

  @Mutation(() => NewsEditorialTransitionModel)
  async cancelNewsSchedule(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: NewsDecisionInput,
  ): Promise<NewsEditorialTransitionModel> {
    return this.toTransition(
      await this.workflow.cancelSchedule(
        actor.id,
        input.articleId,
        input.reason ?? '',
      ),
    );
  }

  private parseTemplate(value?: string): unknown {
    if (!value) return {};
    try {
      return JSON.parse(value) as unknown;
    } catch {
      throw new BadRequestException('News template data must be valid JSON.');
    }
  }

  private async assertCanReadEditorial(
    actorId: string,
    article: NewsArticle,
  ): Promise<void> {
    if (article.authorId === actorId) return;
    const profile = await this.permissions.getAccessProfileByUserId(actorId);
    if (
      !profile.permissions.includes(Permission.NewsReview) &&
      !profile.permissions.includes(Permission.NewsPublish)
    ) {
      throw new ForbiddenException('News editorial access was denied.');
    }
  }

  private toArticle(article: NewsArticle): NewsEditorialArticleModel {
    return {
      ...article,
      postType: article.postType as NewsPostTypeModel,
      status: article.status as NewsArticleStatusModel,
      visibility: article.visibility as NewsVisibilityModel,
      documentJson: JSON.stringify(article.document),
      templateDataJson: JSON.stringify(article.templateData ?? {}),
    };
  }

  private toTransition(
    result: NewsEditorialTransitionResult,
  ): NewsEditorialTransitionModel {
    return {
      article: this.toArticle(result.article),
      decision: this.toDecision(result.decision),
    };
  }

  private toDecision(
    decision: NewsEditorialDecision,
  ): NewsEditorialDecisionModel {
    return {
      ...decision,
      action: decision.action as NewsEditorialActionModel,
    };
  }
}
