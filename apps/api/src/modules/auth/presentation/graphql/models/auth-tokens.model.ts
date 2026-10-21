/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/models/auth-tokens.model.ts
 *
 * 🎯 Purpose:
 * Defines the GraphQL token-pair contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AuthTokensModel {
  @Field()
  accessToken!: string;

  @Field()
  refreshToken!: string;
}
