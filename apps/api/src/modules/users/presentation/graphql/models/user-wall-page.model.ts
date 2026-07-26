/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/user-wall-page.model.ts
 *
 * 🎯 Purpose:
 * Defines bounded pagination for Profile Wall history.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

import { UserWallPostModel } from './user-wall-post.model';

@ObjectType('ProfileWallPage')
export class UserWallPageModel {
  @Field(() => [UserWallPostModel])
  items!: UserWallPostModel[];

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
 * Bounded pages keep a popular astronaut's wall from becoming one enormous
 * GraphQL meteor.
 */
