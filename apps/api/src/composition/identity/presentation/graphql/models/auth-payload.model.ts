/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/presentation/graphql/models/auth-payload.model.ts
 *
 * 🎯 Purpose:
 * Defines the GraphQL authentication result.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ObjectType } from '@nestjs/graphql';

import { ViewerModel } from '@api/modules/users/presentation';
import { AuthTokensModel } from '@api/modules/auth/presentation';

@ObjectType()
export class AuthPayloadModel {
  @Field(() => ViewerModel)
  user!: ViewerModel;

  @Field(() => AuthTokensModel)
  tokens!: AuthTokensModel;
}
