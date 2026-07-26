/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/user-social-link.model.ts
 *
 * 🎯 Purpose:
 * Defines the public ordered social-link GraphQL contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSocialLink')
export class UserSocialLinkModel {
  @Field(() => ID)
  id!: string;

  @Field()
  platform!: string;

  @Field(() => String, { nullable: true })
  label!: string | null;

  @Field()
  url!: string;

  @Field(() => Int)
  position!: number;
}
