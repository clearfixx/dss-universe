/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/models/news-settings.model.ts
 * 🎯 Purpose: Defines the existing News settings result projection.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';
import { NewsPaginationModeModel } from './news-pagination-mode.model';

@ObjectType('NewsSettings')
export class NewsSettingsModel {
  @Field(() => NewsPaginationModeModel)
  newsPaginationMode!: NewsPaginationModeModel;

  @Field(() => Int)
  newsPaginationThreshold!: number;

  @Field(() => Int)
  newsPageSize!: number;

  @Field(() => NewsPaginationModeModel)
  commentsPaginationMode!: NewsPaginationModeModel;

  @Field(() => Int)
  commentsPaginationThreshold!: number;

  @Field(() => Int)
  commentsPageSize!: number;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
