/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/mappers/user.mapper.ts
 *
 * 🎯 Purpose:
 * Maps internal user records into safe user objects.
 *
 * 🧠 Responsibilities:
 * • removes authentication-sensitive fields from safe user objects;
 * • keeps safe user mapping consistent across the Users module;
 * • protects upper layers from accidentally exposing internal user secrets.
 *
 * 🏗️ Architecture:
 * Domain mapper.
 * Converts repository records into safe domain-level user shapes.
 *
 * ⚠️ Important:
 * This mapper must remove both passwordHash and refreshTokenHash.
 * SafeUser is not “less dangerous user”. It is safe user. ☕
 *
 * 💡 Notes:
 * 🧩 Mappers translate between worlds.
 * They should never own business logic.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { UserRecord } from '../types/user-record.type';
import type { SafeUser } from '../types/safe-user.type';

export class UserMapper {
  static toSafeUser(user: UserRecord): SafeUser {
    const {
      passwordHash: _passwordHash,
      refreshTokenHash: _refreshTokenHash,
      ...safeUser
    } = user;

    void _passwordHash;
    void _refreshTokenHash;

    return safeUser;
  }
}

/**
 * -----------------------------------------------------------------------------
 * Safe users may leave the domain boundary.
 * Authentication secrets stay behind the airlock.
 * -----------------------------------------------------------------------------
 */
