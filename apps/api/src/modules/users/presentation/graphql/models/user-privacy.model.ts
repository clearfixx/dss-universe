/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/models/user-privacy.model.ts
 *
 * 🎯 Purpose:
 * Defines profile privacy settings visible only to their owner.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ObjectType } from '@nestjs/graphql';

import { ProfileVisibilityInput } from '../inputs/update-user-privacy.input';

@ObjectType('UserPrivacySettings')
export class UserPrivacyModel {
  @Field(() => ProfileVisibilityInput)
  profileVisibility!: ProfileVisibilityInput;

  @Field()
  showLocation!: boolean;

  @Field()
  showWebsite!: boolean;

  @Field()
  showSocialLinks!: boolean;

  @Field()
  showLastSeen!: boolean;

  @Field()
  showOnlineStatus!: boolean;

  @Field()
  allowFollowers!: boolean;

  @Field()
  showFollows!: boolean;
}
