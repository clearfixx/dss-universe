/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/presentation/graphql/models/auth-payload.model.ts
 *
 * 🎯 Purpose:
 * Defines the GraphQL authentication result.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ObjectType } from '@nestjs/graphql';

import { ViewerModel } from '../../../../users/presentation/graphql/models/viewer.model';
import { AuthTokensModel } from './auth-tokens.model';

@ObjectType()
export class AuthPayloadModel {
  @Field(() => ViewerModel)
  user!: ViewerModel;

  @Field(() => AuthTokensModel)
  tokens!: AuthTokensModel;
}
