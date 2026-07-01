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
 * • removes sensitive user fields from safe user objects;
 * • keeps safe user mapping consistent across the Users module;
 * • protects upper layers from accidentally exposing authentication data.
 *
 * 🏗️ Architecture:
 * Domain mapper.
 * Converts repository records into safe domain-level user shapes.
 *
 * ⚠️ Important:
 * This mapper currently removes passwordHash explicitly and keeps the rest of
 * the UserRecord shape aligned with SafeUser.
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
    const { passwordHash: _passwordHash, ...safeUser } = user;

    void _passwordHash;

    return safeUser;
  }
}

/**
 * -----------------------------------------------------------------------------
 * Safe users may leave the domain boundary.
 * Sensitive fields stay behind the airlock.
 * -----------------------------------------------------------------------------
 */
