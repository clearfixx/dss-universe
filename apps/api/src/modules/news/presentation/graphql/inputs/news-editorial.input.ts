/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/inputs/news-editorial.input.ts
 * 🎯 Purpose: Defines existing editorial command and browse validation.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, GraphQLISODateTime, ID, InputType, Int } from '@nestjs/graphql';
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
import {
  NewsPostTypeModel,
  NewsVisibilityModel,
} from '../models/news-delivery.enums';
import { NewsArticleStatusModel } from '../models/news-editorial.enums';

@InputType()
export class NewsEditorialBrowseInput {
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
export class CreateNewsDraftInput {
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
export class SaveNewsDraftInput extends CreateNewsDraftInput {
  @Field(() => ID) @IsUUID() articleId!: string;
  @Field(() => Int) @IsInt() @Min(1) baseVersion!: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeSummary?: string;
}

@InputType()
export class NewsDecisionInput {
  @Field(() => ID) @IsUUID() articleId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

@InputType()
export class ScheduleNewsInput {
  @Field(() => ID) @IsUUID() articleId!: string;
  @Field(() => GraphQLISODateTime) scheduledFor!: Date;
  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  displayPublishedAt?: Date;
}

@InputType()
export class PublishNewsInput {
  @Field(() => ID) @IsUUID() articleId!: string;
  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  displayPublishedAt?: Date;
}
