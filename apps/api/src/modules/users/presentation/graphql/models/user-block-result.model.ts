/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/user-block-result.model.ts
 *
 * 🎯 Purpose:
 * Defines explicit GraphQL confirmation for block state mutations.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('UserBlockResult')
export class UserBlockResultModel {
  @Field(() => ID)
  userId!: string;

  @Field()
  blocked!: boolean;
}
