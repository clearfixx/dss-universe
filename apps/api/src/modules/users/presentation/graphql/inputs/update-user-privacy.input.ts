/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/inputs/update-user-privacy.input.ts
 *
 * 🎯 Purpose:
 * Defines the complete owner-controlled profile privacy mutation input.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsBoolean, IsIn } from 'class-validator';

import {
  PROFILE_VISIBILITIES,
  type ProfileVisibility,
} from '../../../domain/types/user-privacy-settings.type';

export enum ProfileVisibilityInput {
  PUBLIC = 'PUBLIC',
  MEMBERS = 'MEMBERS',
  PRIVATE = 'PRIVATE',
}

registerEnumType(ProfileVisibilityInput, { name: 'ProfileVisibility' });

@InputType()
export class UpdateUserPrivacyInput {
  @Field(() => ProfileVisibilityInput)
  @IsIn(PROFILE_VISIBILITIES)
  profileVisibility!: ProfileVisibility;

  @Field()
  @IsBoolean()
  showLocation!: boolean;

  @Field()
  @IsBoolean()
  showWebsite!: boolean;

  @Field()
  @IsBoolean()
  showSocialLinks!: boolean;

  @Field()
  @IsBoolean()
  showLastSeen!: boolean;

  @Field()
  @IsBoolean()
  showOnlineStatus!: boolean;
}
