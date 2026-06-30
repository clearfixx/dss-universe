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
 * This type may contain sensitive fields like passwordHash.
 * Never expose it directly through controllers.
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
  avatarUrl: string | null;
  status: UserStatus;
  refreshTokenHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}
