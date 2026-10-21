/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/viewer.model.ts
 *
 * 🎯 Purpose:
 * Defines account data visible only to the authenticated owner.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ObjectType } from '@nestjs/graphql';

import { UserModel } from './user.model';

@ObjectType('Viewer')
export class ViewerModel extends UserModel {
  @Field()
  email!: string;

  @Field(() => String, { nullable: true })
  emailVerifiedAt!: string | null;

  @Field()
  updatedAt!: string;
}
