/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Notifications
 * 📄 File: apps/api/src/modules/notifications/domain/types/notification-preferences.type.ts
 *
 * 🎯 Purpose:
 * Defines owner-controlled notification channel policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const NOTIFICATION_CATEGORIES = [
  'MENTIONS',
  'DIRECT_MESSAGES',
  'REPUTATION',
  'COMMENTS_REPLIES',
  'SUBSCRIPTIONS',
  'PUBLISHING_REVIEW',
  'SUPPORT',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const NOTIFICATION_DIGEST_FREQUENCIES = [
  'OFF',
  'DAILY',
  'WEEKLY',
] as const;

export type NotificationDigestFrequency =
  (typeof NOTIFICATION_DIGEST_FREQUENCIES)[number];

export interface NotificationPreferences {
  userId: string;
  inAppCategories: NotificationCategory[];
  emailEnabled: boolean;
  emailCategories: NotificationCategory[];
  digestFrequency: NotificationDigestFrequency;
}

export type UpdateNotificationPreferences = Omit<
  NotificationPreferences,
  'userId'
>;

/**
 * 🔔 Security notices are deliberately absent: the airlock never has a mute
 * button.
 */
