/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/dto/responses/user.response.dto.ts
 *
 * 🎯 Purpose:
 * Defines the public response contract returned by the Users module.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserStatus } from '@prisma/client';

export type UserResponseDto = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};
