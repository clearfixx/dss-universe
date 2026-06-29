/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/interfaces/users.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines the Users repository injection token and persistence contract.
 *
 * 🧠 Responsibilities:
 * • declares the USERS_REPOSITORY provider token;
 * • describes user lookup operations;
 * • describes user creation and refresh-token update operations.
 *
 * 🏗️ Architecture:
 * Repository contract used by Users and Auth modules.
 * This interface will later move into the domain layer during 2.6.2.
 *
 * ⚠️ Important:
 * This contract currently returns Prisma User records for auth compatibility.
 * Do not introduce a second parallel repository contract.
 *
 * 💡 Notes:
 * Contracts first. Implementations later.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Prisma, User } from '@prisma/client';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface UsersRepository {
  findById(id: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  create(data: Prisma.UserCreateInput): Promise<User>;

  updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<User>;
}

/**
 * -----------------------------------------------------------------------------
 * 🗄️ A repository contract is a promise.
 * Keep it stable until the migration is deliberate.
 * -----------------------------------------------------------------------------
 */
