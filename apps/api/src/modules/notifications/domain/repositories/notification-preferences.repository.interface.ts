/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Notifications
 * 📄 File: apps/api/src/modules/notifications/domain/repositories/notification-preferences.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence for owner-controlled notification preferences.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  NotificationPreferences,
  UpdateNotificationPreferences,
} from '../types/notification-preferences.type';

export const NOTIFICATION_PREFERENCES_REPOSITORY = Symbol(
  'NOTIFICATION_PREFERENCES_REPOSITORY',
);

export interface NotificationPreferencesRepository {
  findByUserId(userId: string): Promise<NotificationPreferences | null>;
  upsert(
    userId: string,
    preferences: UpdateNotificationPreferences,
  ): Promise<NotificationPreferences>;
}

/**
 * Persistence stores policy; delivery workers merely obey it.
 */
