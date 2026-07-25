/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/safe-user.type.ts
 *
 * 🎯 Purpose:
 * Defines the safe user shape that may leave the internal persistence boundary.
 *
 * ⚠️ Important:
 * SafeUser must never contain authentication secrets such as passwordHash
 * or refreshTokenHash.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserStatus } from '@prisma/client';

export interface SafeUser {
  id: string;
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
  emailVerifiedAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
