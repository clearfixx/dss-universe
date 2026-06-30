/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/mappers/user-response.mapper.ts
 *
 * 🎯 Purpose:
 * Maps safe internal user objects into public user response DTOs.
 *
 * 🧠 Responsibilities:
 * • converts SafeUser into UserResponseDto;
 * • keeps public API response shape explicit;
 * • protects controllers from internal user models.
 *
 * 🏗️ Architecture:
 * Application mapper. Used by UsersService before returning public data.
 *
 * ⚠️ Important:
 * Never expose password hashes, verification internals, or auth secrets here.
 *
 * 💡 Notes:
 * 📨 DTO is a contract. If it changes, the API changed too.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { SafeUser } from '../../domain/types/safe-user.type';
import type { UserResponseDto } from '../dto/responses/user.response.dto';

export class UserResponseMapper {
  static toDto(user: SafeUser): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
