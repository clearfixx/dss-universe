/**
 * =============================================================================
 * DSS Universe
 * -----------------------------------------------------------------------------
 * User Mapper
 *
 * Converts internal User entities into safe public-facing user objects.
 *
 * Important:
 * passwordHash must never leave the backend mapper layer.
 * This mapper is one of the small airlocks that keeps sensitive data inside
 * the station. 🛰️
 * =============================================================================
 */

import { User } from '@prisma/client';

import { SafeUser } from '../types/safe-user.type';

export class UserMapper {
  static toSafeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safeUser } = user;

    void _passwordHash;

    return safeUser;
  }
}
