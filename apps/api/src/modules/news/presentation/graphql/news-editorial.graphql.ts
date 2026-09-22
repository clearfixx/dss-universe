import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  Args,
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import {
  IsEnum,
  IsArray,
  IsInt,
  IsJSON,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  ArrayMaxSize,
  Min,
  MinLength,
} from 'class-validator';

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
} from './news-delivery.graphql';

enum NewsArticleStatusModel {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

enum NewsEditorialActionModel {
  SUBMITTED = 'SUBMITTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  SCHEDULE_CANCELLED = 'SCHEDULE_CANCELLED',
  PUBLISHED = 'PUBLISHED',
}

registerEnumType(NewsArticleStatusModel, { name: 'NewsArticleStatus' });
registerEnumType(NewsEditorialActionModel, { name: 'NewsEditorialAction' });

@ObjectType('NewsEditorialArticle')
class NewsEditorialArticleModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) interactionTargetId!: string;
  @Field(() => ID) authorId!: string;
  @Field(() => NewsPostTypeModel) postType!: NewsPostTypeModel;
  @Field(() => NewsArticleStatusModel) status!: NewsArticleStatusModel;
  @Field(() => NewsVisibilityModel) visibility!: NewsVisibilityModel;
  @Field() language!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field() shortText!: string;
  @Field() documentJson!: string;
  @Field() templateDataJson!: string;
  @Field(() => ID, { nullable: true }) coverMediaId!: string | null;
  @Field(() => Int) currentVersion!: number;
  @Field(() => Int, { nullable: true }) approvedVersion!: number | null;
  @Field() allowComments!: boolean;
  @Field() allowRating!: boolean;
  @Field() allowSharing!: boolean;
  @Field() allowIndexing!: boolean;
  @Field() showOnHomepage!: boolean;
  @Field() featured!: boolean;
  @Field(() => GraphQLISODateTime, { nullable: true })
  submittedAt!: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  approvedAt!: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  scheduledFor!: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  publishedAt!: Date | null;
  @Field(() => GraphQLISODateTime, { nullable: true })
  displayPublishedAt!: Date | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
}

@ObjectType('NewsEditorialDecision')
class NewsEditorialDecisionModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) articleId!: string;
  @Field(() => Int) revisionVersion!: number;
  @Field(() => ID) actorId!: string;
  @Field(() => NewsEditorialActionModel) action!: NewsEditorialActionModel;
  @Field(() => String, { nullable: true }) reason!: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}

@ObjectType('NewsEditorialTransition')
class NewsEditorialTransitionModel {
  @Field(() => NewsEditorialArticleModel) article!: NewsEditorialArticleModel;
  @Field(() => NewsEditorialDecisionModel)
  decision!: NewsEditorialDecisionModel;
}

@ObjectType('NewsEditorialPage')
class NewsEditorialPageModel {
  @Field(() => [NewsEditorialArticleModel]) items!: NewsEditorialArticleModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
  @Field(() => Int) totalPages!: number;
}

@InputType()
class NewsEditorialBrowseInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @Field(() => [NewsArticleStatusModel], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsEnum(NewsArticleStatusModel, { each: true })
  statuses?: NewsArticleStatusModel[];
}

@InputType()
class CreateNewsDraftInput {
  @Field(() => NewsPostTypeModel)
  @IsEnum(NewsPostTypeModel)
  postType!: NewsPostTypeModel;

  @Field(() => NewsVisibilityModel)
  @IsEnum(NewsVisibilityModel)
  visibility!: NewsVisibilityModel;

  @Field() @IsString() @MinLength(2) @MaxLength(8) language!: string;
  @Field() @IsString() @MinLength(1) @MaxLength(180) slug!: string;
  @Field() @IsString() @MinLength(3) @MaxLength(180) title!: string;
  @Field() @IsString() @MinLength(10) @MaxLength(500) shortText!: string;
  @Field() @IsString() documentJson!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsJSON()
  templateDataJson?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  coverMediaId?: string;
}

@InputType()
class SaveNewsDraftInput extends CreateNewsDraftInput {
  @Field(() => ID) @IsUUID() articleId!: string;
  @Field(() => Int) @IsInt() @Min(1) baseVersion!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeSummary?: string;
}

@InputType()
class NewsDecisionInput {
  @Field(() => ID) @IsUUID() articleId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

@InputType()
class ScheduleNewsInput {
  @Field(() => ID) @IsUUID() articleId!: string;
  @Field(() => GraphQLISODateTime) scheduledFor!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  displayPublishedAt?: Date;
}

@InputType()
class PublishNewsInput {
  @Field(() => ID) @IsUUID() articleId!: string;
  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  displayPublishedAt?: Date;
}

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
