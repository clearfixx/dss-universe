/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/user-social-graph.model.ts
 *
 * 🎯 Purpose:
 * Defines the GraphQL result of social graph mutations.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSocialGraphSummary')
export class UserSocialGraphModel {
  @Field(() => ID)
  userId!: string;

  @Field(() => Int)
  followerCount!: number;

  @Field(() => Int)
  followingCount!: number;
}
