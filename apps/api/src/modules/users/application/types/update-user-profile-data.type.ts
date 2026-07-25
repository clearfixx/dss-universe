/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/types/update-user-profile-data.type.ts
 *
 * 🎯 Purpose:
 * Defines the application-level data contract for updating a user's
 * public profile information.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type UpdateUserProfileData = Partial<{
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  technologies: string[];
  interests: string[];
}>;

/**
 * 📝 Profile update data is intentionally small.
 * Avatar, cover, status, email and password changes have their own flows.
 */
