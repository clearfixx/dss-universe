/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/models/revoke-sessions-result.model.ts
 *
 * 🎯 Purpose:
 * Reports the result of a bulk session revocation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RevokeSessionsResultModel {
  @Field()
  success!: boolean;

  @Field(() => Int)
  revokedCount!: number;
}

/**
 * 🧹 One click, fewer open airlocks.
 */
