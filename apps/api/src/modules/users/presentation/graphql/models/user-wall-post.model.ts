/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/user-wall-post.model.ts
 *
 * 🎯 Purpose:
 * Defines the GraphQL projection for visible posts and deleted tombstones.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('ProfileWallPost')
export class UserWallPostModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  profileOwnerId!: string;

  @Field(() => ID)
  authorId!: string;

  @Field(() => String, { nullable: true })
  body!: string | null;

  @Field(() => ID, { nullable: true })
  imageMediaId!: string | null;

  @Field()
  isDeleted!: boolean;

  @Field(() => String, { nullable: true })
  deletedAt!: string | null;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

/**
 * A tombstone says “something was here” without repeating what should no
 * longer be public.
 */
