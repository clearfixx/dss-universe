/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/update-user-data.type.ts
 *
 * 🎯 Purpose:
 * Defines the allowed data shape for updating user records through
 * the Users repository abstraction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserStatus } from '@prisma/client';

export type UpdateUserData = Partial<{
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  technologies: string[];
  interests: string[];
  avatarUrl: string | null;
  coverUrl: string | null;
  status: UserStatus;
  passwordHash: string;
  emailVerifiedAt: Date | null;
  lastSeenAt: Date | null;
}>;

/**
 * 📝 UpdateUserData is intentionally not a Prisma type.
 * Domain contracts should not leak database implementation details.
 */
