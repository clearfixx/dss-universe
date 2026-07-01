/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/mappers/user-response.mapper.ts
 *
 * 🎯 Purpose:
 * Maps safe user objects into public API response DTOs.
 *
 * 🧠 Responsibilities:
 * • converts safe domain user data into response DTOs;
 * • keeps API response shape stable;
 * • prevents internal user fields from leaking outside the application layer.
 *
 * 🏗️ Architecture:
 * Application mapper.
 * Translates domain-safe user data into an API-facing contract.
 *
 * ⚠️ Important:
 * This mapper must never expose authentication-sensitive fields.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { SafeUser } from '../../domain/types/safe-user.type';
import type { UserResponseDto } from '../dto';

export class UserResponseMapper {
  static toDto(user: SafeUser): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
