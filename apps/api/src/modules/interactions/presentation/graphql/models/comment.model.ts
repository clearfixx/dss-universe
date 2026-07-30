/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/models/comment.model.ts
 *
 * 🎯 Purpose:
 * Defines privacy-safe GraphQL projections for comments and revisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Comment')
export class CommentModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  interactionTargetId!: string;

  @Field(() => ID)
  authorId!: string;

  @Field(() => ID, { nullable: true })
  parentId!: string | null;

  @Field(() => String, { nullable: true })
  body!: string | null;

  @Field()
  isDeleted!: boolean;

  @Field(() => String, { nullable: true })
  editedAt!: string | null;

  @Field(() => String, { nullable: true })
  deletedAt!: string | null;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

@ObjectType('CommentPage')
export class CommentPageModel {
  @Field(() => [CommentModel])
  items!: CommentModel[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;
}

@ObjectType('CommentRevision')
export class CommentRevisionModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  commentId!: string;

  @Field(() => Int)
  version!: number;

  @Field()
  body!: string;

  @Field(() => ID)
  editorId!: string;

  @Field()
  createdAt!: string;
}

/**
 * Deleted bodies stay behind the API boundary; the tombstone keeps its seat.
 */
