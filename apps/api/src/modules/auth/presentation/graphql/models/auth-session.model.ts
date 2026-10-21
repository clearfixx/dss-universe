/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/models/auth-session.model.ts
 *
 * 🎯 Purpose:
 * Exposes safe device-session metadata to its owner.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType('AuthSession')
export class AuthSessionModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  userAgent!: string | null;

  @Field(() => String, { nullable: true })
  ipAddress!: string | null;

  @Field(() => GraphQLISODateTime)
  expiresAt!: Date;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field()
  current!: boolean;
}

/**
 * 🖥️ Show the owner the footprint, never the token hash.
 */
