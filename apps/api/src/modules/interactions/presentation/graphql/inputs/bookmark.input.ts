/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/inputs/bookmark.input.ts
 *
 * 🎯 Purpose:
 * Defines bounded GraphQL pagination for the viewer's private bookmarks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

@InputType()
export class BookmarksPageInput {
  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

/**
 * Pagination is public math around a strictly private collection.
 */
