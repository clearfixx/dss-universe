/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/user-privacy-settings.type.ts
 *
 * 🎯 Purpose:
 * Defines profile privacy policy independently from persistence technology.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export const PROFILE_VISIBILITIES = ['PUBLIC', 'MEMBERS', 'PRIVATE'] as const;

export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export type UserPrivacySettings = {
  userId: string;
  profileVisibility: ProfileVisibility;
  showLocation: boolean;
  showWebsite: boolean;
  showSocialLinks: boolean;
  showLastSeen: boolean;
  showOnlineStatus: boolean;
  allowFollowers: boolean;
  showFollows: boolean;
  allowWallPosts: boolean;
};

export type UpdateUserPrivacySettings = Omit<UserPrivacySettings, 'userId'>;
