/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/graphql/inputs/media-library.input.ts
 *
 * 🎯 Purpose:
 * Defines bounded GraphQL filters for the Mission Control Media Library.
 *
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
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import {
  MediaKind,
  MediaStatus,
  MediaVisibility,
} from '../enums/media-graphql.enums';

@InputType()
export class MediaLibraryInput {
  @Field(() => Int, { defaultValue: 25 })
  @IsInt()
  @Min(1)
  @Max(100)
  first = 25;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  after?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @Field(() => MediaStatus, { nullable: true })
  @IsOptional()
  @IsEnum(MediaStatus)
  status?: MediaStatus;

  @Field(() => MediaKind, { nullable: true })
  @IsOptional()
  @IsEnum(MediaKind)
  kind?: MediaKind;

  @Field(() => MediaVisibility, { nullable: true })
  @IsOptional()
  @IsEnum(MediaVisibility)
  visibility?: MediaVisibility;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  orphaned?: boolean;
}
