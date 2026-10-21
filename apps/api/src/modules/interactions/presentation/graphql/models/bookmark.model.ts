/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/models/bookmark.model.ts
 *
 * 🎯 Purpose:
 * Defines privacy-safe GraphQL projections for saved-item relationships.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Bookmark')
export class BookmarkModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  interactionTargetId!: string;

  @Field()
  createdAt!: string;
}

@ObjectType('BookmarkMutationPayload')
export class BookmarkMutationPayloadModel {
  @Field(() => BookmarkModel, { nullable: true })
  bookmark!: BookmarkModel | null;

  @Field()
  saved!: boolean;

  @Field()
  changed!: boolean;
}

@ObjectType('BookmarkPage')
export class BookmarkPageModel {
  @Field(() => [BookmarkModel])
  items!: BookmarkModel[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;
}

/**
 * Owner IDs stay implicit: the authenticated viewer is the only possible owner.
 */
