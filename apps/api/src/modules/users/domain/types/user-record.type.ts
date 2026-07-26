/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/user-record.type.ts
 *
 * 🎯 Purpose:
 * Defines the internal user persistence record used inside backend services.
 *
 * ⚠️ Important:
 * This type may contain authentication secrets like passwordHash
 * and refreshTokenHash. Never expose it directly through controllers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserStatus } from '@prisma/client';

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  technologies: string[];
  interests: string[];
  avatarUrl: string | null;
  coverUrl: string | null;
  status: UserStatus;
  deactivatedAt: Date | null;
  authVersion: number;
  refreshTokenHash: string | null;
  emailVerifiedAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
