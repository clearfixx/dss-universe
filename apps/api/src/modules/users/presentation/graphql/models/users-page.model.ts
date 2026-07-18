/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/users-page.model.ts
 *
 * 🎯 Purpose:
 * Defines the bounded offset-pagination result for user queries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

import { UserModel } from './user.model';

@ObjectType()
export class UsersPageModel {
  @Field(() => [UserModel])
  items!: UserModel[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;
}
