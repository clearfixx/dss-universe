/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Notifications
 * 📄 File: apps/api/src/modules/notifications/presentation/graphql/models/notification-preferences.model.ts
 *
 * 🎯 Purpose:
 * Exposes notification delivery preferences to their owner.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ObjectType } from '@nestjs/graphql';

import {
  NotificationCategoryInput,
  NotificationDigestFrequencyInput,
} from '../inputs/update-notification-preferences.input';

@ObjectType('NotificationPreferences')
export class NotificationPreferencesModel {
  @Field(() => [NotificationCategoryInput])
  inAppCategories!: NotificationCategoryInput[];

  @Field()
  emailEnabled!: boolean;

  @Field(() => [NotificationCategoryInput])
  emailCategories!: NotificationCategoryInput[];

  @Field(() => NotificationDigestFrequencyInput)
  digestFrequency!: NotificationDigestFrequencyInput;
}

/**
 * Only the owner sees the switches; delivery services see the resulting policy.
 */
