/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/safe-user.type.ts
 *
 * 🎯 Purpose:
 * Defines the safe public-facing user shape returned outside the backend core.
 *
 * ⚠️ Important:
 * SafeUser must never contain passwordHash.
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
  avatarUrl: string | null;
  status: UserStatus;
  refreshTokenHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}
