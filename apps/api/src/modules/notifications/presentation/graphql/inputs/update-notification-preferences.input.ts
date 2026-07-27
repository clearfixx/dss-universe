/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Notifications
 * 📄 File: apps/api/src/modules/notifications/presentation/graphql/inputs/update-notification-preferences.input.ts
 *
 * 🎯 Purpose:
 * Defines the complete owner notification-preferences mutation input.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { ArrayUnique, IsBoolean, IsEnum } from 'class-validator';

import type {
  NotificationCategory,
  NotificationDigestFrequency,
} from '../../../domain/types/notification-preferences.type';

export enum NotificationCategoryInput {
  MENTIONS = 'MENTIONS',
  DIRECT_MESSAGES = 'DIRECT_MESSAGES',
  REPUTATION = 'REPUTATION',
  COMMENTS_REPLIES = 'COMMENTS_REPLIES',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  PUBLISHING_REVIEW = 'PUBLISHING_REVIEW',
  SUPPORT = 'SUPPORT',
}

export enum NotificationDigestFrequencyInput {
  OFF = 'OFF',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
}

registerEnumType(NotificationCategoryInput, {
  name: 'NotificationCategory',
});
registerEnumType(NotificationDigestFrequencyInput, {
  name: 'NotificationDigestFrequency',
});

@InputType()
export class UpdateNotificationPreferencesInput {
  @Field(() => [NotificationCategoryInput])
  @ArrayUnique()
  @IsEnum(NotificationCategoryInput, { each: true })
  inAppCategories!: NotificationCategory[];

  @Field()
  @IsBoolean()
  emailEnabled!: boolean;

  @Field(() => [NotificationCategoryInput])
  @ArrayUnique()
  @IsEnum(NotificationCategoryInput, { each: true })
  emailCategories!: NotificationCategory[];

  @Field(() => NotificationDigestFrequencyInput)
  @IsEnum(NotificationDigestFrequencyInput)
  digestFrequency!: NotificationDigestFrequency;
}

/**
 * Complete replacement keeps the settings screen deterministic and auditable.
 */
