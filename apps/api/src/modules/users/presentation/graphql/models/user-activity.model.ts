/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/user-activity.model.ts
 *
 * 🎯 Purpose:
 * Exposes privacy-safe projected user activity through GraphQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('UserActivity')
export class UserActivityModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  actorId!: string;

  @Field()
  module!: string;

  @Field()
  action!: string;

  @Field()
  subjectType!: string;

  @Field(() => ID)
  subjectId!: string;

  @Field()
  occurredAt!: string;
}

@ObjectType('UserActivityPage')
export class UserActivityPageModel {
  @Field(() => [UserActivityModel])
  items!: UserActivityModel[];

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
 * GraphQL receives safe metadata, never a suitcase full of domain internals.
 */
