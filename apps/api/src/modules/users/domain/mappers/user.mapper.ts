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
 * • copies only explicitly supported safe profile fields;
 * • keeps safe user mapping consistent across the Users module;
 * • protects upper layers from accidentally exposing internal user secrets.
 *
 * 🏗️ Architecture:
 * Domain mapper.
 * Converts repository records into safe domain-level user shapes.
 *
 * ⚠️ Important:
 * Never spread a persistence record or maintain a blacklist of secret fields.
 * New internal fields must remain private without requiring a mapper change.
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
  static toSafeUser(user: Pick<UserRecord, keyof SafeUser>): SafeUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      location: user.location,
      website: user.website,
      technologies: user.technologies,
      interests: user.interests,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

/**
 * -----------------------------------------------------------------------------
 * Safe users may leave the domain boundary.
 * Authentication secrets stay behind the airlock.
 * -----------------------------------------------------------------------------
 */
