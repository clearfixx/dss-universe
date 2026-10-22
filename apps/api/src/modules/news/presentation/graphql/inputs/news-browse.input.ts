/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/inputs/news-browse.input.ts
 * 🎯 Purpose: Defines the existing News browse transport validation.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { NewsPostTypeModel } from '../models/news-delivery.enums';

@InputType()
export class NewsBrowseInput {
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
