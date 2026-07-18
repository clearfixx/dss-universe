/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/user.model.ts
 *
 * 🎯 Purpose:
 * Defines the public GraphQL user contract without private account fields.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('User')
export class UserModel {
  @Field(() => ID)
  id!: string;

  @Field()
  username!: string;

  @Field(() => String, { nullable: true })
  displayName!: string | null;

  @Field(() => String, { nullable: true })
  bio!: string | null;

  @Field(() => String, { nullable: true })
  avatarUrl!: string | null;

  @Field(() => String, { nullable: true })
  coverUrl!: string | null;

  @Field()
  status!: string;

  @Field(() => String, { nullable: true })
  lastSeenAt!: string | null;

  @Field()
  createdAt!: string;
}
