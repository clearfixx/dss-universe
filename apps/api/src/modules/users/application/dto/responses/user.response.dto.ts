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

export interface UserResponseDto {
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
  emailVerifiedAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}
