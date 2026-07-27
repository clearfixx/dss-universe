/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/profile-completion.model.ts
 *
 * 🎯 Purpose:
 * Exposes owner profile completion through the GraphQL schema.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

import {
  PROFILE_COMPLETION_FIELDS,
  type ProfileCompletionField,
} from '../../../domain/types/profile-completion.type';

export const ProfileCompletionFieldModel = Object.fromEntries(
  PROFILE_COMPLETION_FIELDS.map((field) => [field, field]),
) as Record<ProfileCompletionField, ProfileCompletionField>;

registerEnumType(ProfileCompletionFieldModel, {
  name: 'ProfileCompletionField',
});

@ObjectType('ProfileCompletion')
export class ProfileCompletionModel {
  @Field(() => Int)
  percentage!: number;

  @Field(() => Int)
  completedCount!: number;

  @Field(() => Int)
  totalCount!: number;

  @Field()
  isComplete!: boolean;

  @Field(() => [ProfileCompletionFieldModel])
  completedFields!: ProfileCompletionField[];

  @Field(() => [ProfileCompletionFieldModel])
  missingFields!: ProfileCompletionField[];
}

/**
 * The API returns field keys so every DSS client can speak its own language.
 */
