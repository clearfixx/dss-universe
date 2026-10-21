/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Notifications
 * 📄 File: apps/api/src/modules/notifications/application/services/notification-preferences.service.ts
 *
 * 🎯 Purpose:
 * Supplies defaults and updates notification delivery preferences.
 *
 * 🧠 Responsibilities:
 * • returns stable defaults before the first owner update;
 * • normalizes category ordering;
 * • delegates durable persistence through the repository boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_PREFERENCES_REPOSITORY,
  type NotificationPreferencesRepository,
} from '../../domain/repositories/notification-preferences.repository.interface';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationPreferences,
  type UpdateNotificationPreferences,
} from '../../domain/types/notification-preferences.type';

export const DEFAULT_NOTIFICATION_PREFERENCES: UpdateNotificationPreferences = {
  inAppCategories: [...NOTIFICATION_CATEGORIES],
  emailEnabled: true,
  emailCategories: [
    'MENTIONS',
    'DIRECT_MESSAGES',
    'PUBLISHING_REVIEW',
    'SUPPORT',
  ],
  digestFrequency: 'OFF',
};

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @Inject(NOTIFICATION_PREFERENCES_REPOSITORY)
    private readonly preferences: NotificationPreferencesRepository,
  ) {}

  async get(userId: string): Promise<NotificationPreferences> {
    return (
      (await this.preferences.findByUserId(userId)) ?? {
        userId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        inAppCategories: [...DEFAULT_NOTIFICATION_PREFERENCES.inAppCategories],
        emailCategories: [...DEFAULT_NOTIFICATION_PREFERENCES.emailCategories],
      }
    );
  }

  update(
    userId: string,
    preferences: UpdateNotificationPreferences,
  ): Promise<NotificationPreferences> {
    return this.preferences.upsert(userId, {
      ...preferences,
      inAppCategories: this.orderedUnique(preferences.inAppCategories),
      emailCategories: this.orderedUnique(preferences.emailCategories),
    });
  }

  private orderedUnique(
    categories: NotificationCategory[],
  ): NotificationCategory[] {
    const selected = new Set(categories);
    return NOTIFICATION_CATEGORIES.filter((category) => selected.has(category));
  }
}

/**
 * 📡 Preferences shape the signal; mandatory security alerts still get home.
 */
