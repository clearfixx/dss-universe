/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/update-user-data.type.ts
 *
 * 🎯 Purpose:
 * Defines profile-only update data; Auth credentials and account state are excluded.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type UpdateUserData = Partial<{
  username: string;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  technologies: string[];
  interests: string[];
  avatarUrl: string | null;
  coverUrl: string | null;
  lastSeenAt: Date | null;
}>;

/**
 * 📝 UpdateUserData is intentionally not a Prisma type.
 * Domain contracts should not leak database implementation details.
 */
