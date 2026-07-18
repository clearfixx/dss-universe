/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/models/logout-result.model.ts
 *
 * 🎯 Purpose:
 * Defines the GraphQL logout acknowledgement.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LogoutResultModel {
  @Field()
  success!: boolean;
}
