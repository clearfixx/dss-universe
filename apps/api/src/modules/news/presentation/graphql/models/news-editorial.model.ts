/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/models/news-editorial.model.ts
 * 🎯 Purpose: Defines structural News editorial result projections.
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
import { NewsPostTypeModel, NewsVisibilityModel } from './news-delivery.enums';
import {
  NewsArticleStatusModel,
  NewsEditorialActionModel,
} from './news-editorial.enums';

@ObjectType('NewsEditorialArticle')
export class NewsEditorialArticleModel {
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
export class NewsEditorialDecisionModel {
  @Field(() => ID) id!: string;
  @Field(() => ID) articleId!: string;
  @Field(() => Int) revisionVersion!: number;
  @Field(() => ID) actorId!: string;
  @Field(() => NewsEditorialActionModel) action!: NewsEditorialActionModel;
  @Field(() => String, { nullable: true }) reason!: string | null;
  @Field(() => GraphQLISODateTime) createdAt!: Date;
}

@ObjectType('NewsEditorialTransition')
export class NewsEditorialTransitionModel {
  @Field(() => NewsEditorialArticleModel) article!: NewsEditorialArticleModel;
  @Field(() => NewsEditorialDecisionModel)
  decision!: NewsEditorialDecisionModel;
}

@ObjectType('NewsEditorialPage')
export class NewsEditorialPageModel {
  @Field(() => [NewsEditorialArticleModel]) items!: NewsEditorialArticleModel[];
  @Field(() => Int) total!: number;
  @Field(() => Int) page!: number;
  @Field(() => Int) pageSize!: number;
  @Field(() => Int) totalPages!: number;
}
