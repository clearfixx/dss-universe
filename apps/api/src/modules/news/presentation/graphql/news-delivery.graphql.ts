import { ExecutionContext, Injectable, UseGuards } from '@nestjs/common';
import {
  Args,
  Context,
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  Int,
  ObjectType,
  Query,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { NewsDeliveryService } from '../../application/services/news-delivery.service';
import { NewsSettingsService } from '../../application/services/news-settings.service';
import type { FullNewsItem } from '../../domain/types/short-news.type';
import type { NewsChronologicalNavigation } from '../../domain/types/news-links.type';
import type { AuthenticatedUser } from '@api/core/auth';

@Injectable()
export class OptionalNewsJwtGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    return GqlExecutionContext.create(context).getContext<{
      req: { user?: AuthenticatedUser };
    }>().req;
  }

  handleRequest<TUser>(error: unknown, user: TUser): TUser | undefined {
    return error ? undefined : user;
  }
}

export enum NewsPostTypeModel {
  STANDARD = 'STANDARD',
  TEXT = 'TEXT',
  GALLERY = 'GALLERY',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
}

export enum NewsVisibilityModel {
  PUBLIC = 'PUBLIC',
  MEMBERS = 'MEMBERS',
}

export enum NewsVoteKindModel {
  UPVOTE = 'UPVOTE',
  DOWNVOTE = 'DOWNVOTE',
}

export enum NewsShareChannelModel {
  FACEBOOK = 'FACEBOOK',
  X = 'X',
  THREADS = 'THREADS',
  INSTAGRAM = 'INSTAGRAM',
  PINTEREST = 'PINTEREST',
  COPY_LINK = 'COPY_LINK',
  PRINT = 'PRINT',
}

registerEnumType(NewsPostTypeModel, { name: 'NewsPostType' });
registerEnumType(NewsVisibilityModel, { name: 'NewsVisibility' });
registerEnumType(NewsVoteKindModel, { name: 'NewsVoteKind' });
registerEnumType(NewsShareChannelModel, { name: 'NewsShareChannel' });

@ObjectType('NewsAuthor')
class NewsAuthorModel {
  @Field(() => ID) id!: string;
  @Field() username!: string;
  @Field(() => String, { nullable: true }) displayName!: string | null;
  @Field(() => String, { nullable: true }) avatarUrl!: string | null;
}

@ObjectType('NewsCategorySummary')
class NewsCategorySummaryModel {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() slug!: string;
  @Field(() => String, { nullable: true }) icon!: string | null;
}

@ObjectType('NewsTagSummary')
class NewsTagSummaryModel {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() slug!: string;
}

@ObjectType('NewsEngagement')
class NewsEngagementModel {
  @Field(() => Int, { nullable: true }) viewCount!: number | null;
  @Field(() => Int) commentCount!: number;
  @Field(() => Int) upvotes!: number;
  @Field(() => Int) downvotes!: number;
  @Field(() => Int) score!: number;
  @Field() bookmarkedByViewer!: boolean;
  @Field(() => NewsVoteKindModel, { nullable: true })
  viewerReaction!: NewsVoteKindModel | null;
}

@ObjectType('ShortNews')
class ShortNewsModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) interactionTargetId!: string;
  @Field(() => NewsPostTypeModel) postType!: NewsPostTypeModel;
  @Field(() => NewsVisibilityModel) visibility!: NewsVisibilityModel;
  @Field() language!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field() shortText!: string;
  @Field(() => ID, { nullable: true }) coverMediaId!: string | null;
  @Field(() => GraphQLISODateTime) publishedAt!: Date;
  @Field(() => GraphQLISODateTime) displayPublishedAt!: Date;
  @Field() featured!: boolean;
  @Field(() => NewsAuthorModel) author!: NewsAuthorModel;
  @Field(() => NewsCategorySummaryModel, { nullable: true })
  primaryCategory!: NewsCategorySummaryModel | null;
  @Field(() => [NewsTagSummaryModel]) tags!: NewsTagSummaryModel[];
  @Field(() => NewsEngagementModel) engagement!: NewsEngagementModel;
}

@ObjectType('NewsRelatedItem')
class NewsRelatedItemModel {
  @Field(() => ID) id!: string;
  @Field() type!: string;
  @Field() anchorText!: string;
  @Field() language!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field() shortText!: string;
  @Field(() => ID, { nullable: true }) coverMediaId!: string | null;
  @Field(() => GraphQLISODateTime) displayPublishedAt!: Date;
}

@ObjectType('NewsAttachment')
class NewsAttachmentModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) mediaId!: string;
  @Field() label!: string;
  @Field() filename!: string;
  @Field() mimeType!: string;
  @Field() extension!: string;
  @Field(() => Int) size!: number;
  @Field() kind!: string;
  @Field() checksumSha256!: string;
  @Field(() => String, { nullable: true }) checksumSha1!: string | null;
  @Field(() => String, { nullable: true }) checksumMd5!: string | null;
  @Field() downloadUrl!: string;
}

@ObjectType('NewsShareChannelCount')
class NewsShareChannelCountModel {
  @Field(() => NewsShareChannelModel) channel!: NewsShareChannelModel;
  @Field(() => Int) count!: number;
}

@ObjectType('NewsSharing')
class NewsSharingModel {
  @Field(() => Int) total!: number;
  @Field(() => [NewsShareChannelCountModel])
  channels!: NewsShareChannelCountModel[];
}

@ObjectType('FullNews')
class FullNewsModel extends ShortNewsModel {
  @Field() documentJson!: string;
  @Field() templateDataJson!: string;
  @Field() allowComments!: boolean;
  @Field() allowRating!: boolean;
  @Field() allowSharing!: boolean;
  @Field() allowIndexing!: boolean;
  @Field(() => [NewsRelatedItemModel]) related!: NewsRelatedItemModel[];
  @Field(() => [NewsAttachmentModel]) attachments!: NewsAttachmentModel[];
  @Field(() => NewsSharingModel) sharing!: NewsSharingModel;
}

@ObjectType('NumberedNewsPage')
class NumberedNewsPageModel {
  @Field(() => [ShortNewsModel]) items!: ShortNewsModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
  @Field(() => Int) totalPages!: number;
}

@ObjectType('NewsNavigationItem')
class NewsNavigationItemModel {
  @Field(() => ID) id!: string;
  @Field() language!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field(() => ID, { nullable: true }) coverMediaId!: string | null;
  @Field(() => GraphQLISODateTime) displayPublishedAt!: Date;
}

@ObjectType('NewsNavigation')
class NewsNavigationModel {
  @Field(() => NewsNavigationItemModel, { nullable: true })
  previous!: NewsNavigationItemModel | null;
  @Field(() => NewsNavigationItemModel, { nullable: true })
  next!: NewsNavigationItemModel | null;
}

@ObjectType('NewsRatingVote')
class NewsRatingVoteModel {
  @Field(() => ID) id!: string;
  @Field(() => NewsVoteKindModel) kind!: NewsVoteKindModel;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
  @Field(() => NewsAuthorModel) actor!: NewsAuthorModel;
}

@ObjectType('NewsRatingVotePage')
class NewsRatingVotePageModel {
  @Field(() => [NewsRatingVoteModel]) items!: NewsRatingVoteModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
  @Field(() => Int) totalPages!: number;
}

@ObjectType('NewsCommentEngagement')
class NewsCommentEngagementModel {
  @Field(() => Int) upvotes!: number;
  @Field(() => Int) downvotes!: number;
  @Field(() => Int) score!: number;
  @Field(() => NewsVoteKindModel, { nullable: true })
  viewerReaction!: NewsVoteKindModel | null;
}

@ObjectType('NewsComment')
class NewsCommentModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) reactionTargetId!: string;
  @Field(() => ID, { nullable: true }) parentId!: string | null;
  @Field() body!: string;
  @Field() documentJson!: string;
  @Field() isDeleted!: boolean;
  @Field(() => GraphQLISODateTime, { nullable: true }) editedAt!: Date | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => NewsAuthorModel) author!: NewsAuthorModel;
  @Field(() => NewsCommentEngagementModel)
  engagement!: NewsCommentEngagementModel;
  @Field(() => [NewsCommentModel]) children!: NewsCommentModel[];
}

@ObjectType('NewsCommentsPage')
class NewsCommentsPageModel {
  @Field(() => [NewsCommentModel]) items!: NewsCommentModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
  @Field(() => Int) totalPages!: number;
}

@InputType()
class NewsBrowseInput {
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
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  language?: string;
  @Field(() => NewsPostTypeModel, { nullable: true })
  @IsOptional()
  @IsEnum(NewsPostTypeModel)
  postType?: NewsPostTypeModel;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  categorySlug?: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  tagSlug?: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  search?: string;
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  homepage?: boolean;
}

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
    @Args('articleId', { type: () => ID }) articleId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: 20 }) pageSize: number,
  ): ReturnType<NewsDeliveryService['ratingVotes']> {
    return this.delivery.ratingVotes(articleId, page, pageSize);
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
