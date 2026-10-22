/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/inputs/update-news-settings.input.ts
 * 🎯 Purpose: Defines existing News settings command validation.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { NewsPaginationModeModel } from '../models/news-pagination-mode.model';

@InputType()
export class UpdateNewsSettingsInput {
  @Field(() => NewsPaginationModeModel)
  @IsEnum(NewsPaginationModeModel)
  newsPaginationMode!: NewsPaginationModeModel;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(500)
  newsPaginationThreshold!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(100)
  newsPageSize!: number;

  @Field(() => NewsPaginationModeModel)
  @IsEnum(NewsPaginationModeModel)
  commentsPaginationMode!: NewsPaginationModeModel;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(500)
  commentsPaginationThreshold!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(100)
  commentsPageSize!: number;
}
