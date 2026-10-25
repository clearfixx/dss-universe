/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/models/news-delivery.model.ts
 * 🎯 Purpose: Defines structural News delivery GraphQL result projections.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import { NewsPinScopeModel } from './news-pin-scope.model';
import {
  NewsPostTypeModel,
  NewsVisibilityModel,
  NewsVoteKindModel,
  NewsShareChannelModel,
} from './news-delivery.enums';

@ObjectType('NewsPin')
export class NewsPinModel {
  @Field(() => NewsPinScopeModel) scope!: NewsPinScopeModel;
  @Field(() => ID, { nullable: true }) categoryId!: string | null;
  @Field(() => GraphQLISODateTime, { nullable: true }) expiresAt!: Date | null;
}

@ObjectType('NewsAuthor')
export class NewsAuthorModel {
  @Field(() => ID) id!: string;
  @Field() username!: string;
  @Field(() => String, { nullable: true }) displayName!: string | null;
  @Field(() => String, { nullable: true }) avatarUrl!: string | null;
}

@ObjectType('NewsCategorySummary')
export class NewsCategorySummaryModel {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() slug!: string;
  @Field(() => String, { nullable: true }) icon!: string | null;
}

@ObjectType('NewsTagSummary')
export class NewsTagSummaryModel {
  @Field(() => ID) id!: string;
  @Field() name!: string;
  @Field() slug!: string;
}

@ObjectType('NewsEngagement')
export class NewsEngagementModel {
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
export class ShortNewsModel {
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
  @Field(() => NewsPinModel, { nullable: true }) pin!: NewsPinModel | null;
  @Field(() => NewsAuthorModel) author!: NewsAuthorModel;
  @Field(() => NewsCategorySummaryModel, { nullable: true })
  primaryCategory!: NewsCategorySummaryModel | null;
  @Field(() => [NewsTagSummaryModel]) tags!: NewsTagSummaryModel[];
  @Field(() => NewsEngagementModel) engagement!: NewsEngagementModel;
}

@ObjectType('NewsRelatedItem')
export class NewsRelatedItemModel {
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
export class NewsAttachmentModel {
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
export class NewsShareChannelCountModel {
  @Field(() => NewsShareChannelModel) channel!: NewsShareChannelModel;
  @Field(() => Int) count!: number;
}

@ObjectType('NewsSharing')
export class NewsSharingModel {
  @Field(() => Int) total!: number;
  @Field(() => [NewsShareChannelCountModel])
  channels!: NewsShareChannelCountModel[];
}

@ObjectType('FullNews')
export class FullNewsModel extends ShortNewsModel {
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
export class NumberedNewsPageModel {
  @Field(() => [ShortNewsModel]) pinnedItems!: ShortNewsModel[];
  @Field(() => [ShortNewsModel]) items!: ShortNewsModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
  @Field(() => Int) totalPages!: number;
}

@ObjectType('NewsNavigationItem')
export class NewsNavigationItemModel {
  @Field(() => ID) id!: string;
  @Field() language!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field(() => ID, { nullable: true }) coverMediaId!: string | null;
  @Field(() => GraphQLISODateTime) displayPublishedAt!: Date;
}

@ObjectType('NewsNavigation')
export class NewsNavigationModel {
  @Field(() => NewsNavigationItemModel, { nullable: true })
  previous!: NewsNavigationItemModel | null;
  @Field(() => NewsNavigationItemModel, { nullable: true })
  next!: NewsNavigationItemModel | null;
}

@ObjectType('NewsRatingVote')
export class NewsRatingVoteModel {
  @Field(() => ID) id!: string;
  @Field(() => NewsVoteKindModel) kind!: NewsVoteKindModel;
  @Field(() => GraphQLISODateTime) updatedAt!: Date;
  @Field(() => NewsAuthorModel) actor!: NewsAuthorModel;
}

@ObjectType('NewsRatingVotePage')
export class NewsRatingVotePageModel {
  @Field(() => [NewsRatingVoteModel]) items!: NewsRatingVoteModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
  @Field(() => Int) totalPages!: number;
}

@ObjectType('NewsCommentEngagement')
export class NewsCommentEngagementModel {
  @Field(() => Int) upvotes!: number;
  @Field(() => Int) downvotes!: number;
  @Field(() => Int) score!: number;
  @Field(() => NewsVoteKindModel, { nullable: true })
  viewerReaction!: NewsVoteKindModel | null;
}

@ObjectType('NewsComment')
export class NewsCommentModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) reactionTargetId!: string;
  @Field(() => ID, { nullable: true }) parentId!: string | null;
  @Field(() => String, { nullable: true }) body!: string | null;
  @Field(() => String, { nullable: true }) documentJson!: string | null;
  @Field() isDeleted!: boolean;
  @Field(() => GraphQLISODateTime, { nullable: true }) editedAt!: Date | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
  @Field(() => NewsAuthorModel) author!: NewsAuthorModel;
  @Field(() => NewsCommentEngagementModel)
  engagement!: NewsCommentEngagementModel;
  @Field(() => [NewsCommentModel]) children!: NewsCommentModel[];
}

@ObjectType('NewsCommentsPage')
export class NewsCommentsPageModel {
  @Field(() => [NewsCommentModel]) items!: NewsCommentModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
  @Field(() => Int) totalPages!: number;
}
