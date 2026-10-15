/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/repositories/users.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines the persistence boundary contract for the Users module.
 *
 * 🧠 Responsibilities:
 * • declares user read/write repository operations;
 * • keeps application services independent from Prisma;
 * • defines internal Users operations, excluding Auth credential/state commands.
 *
 * 🏗️ Architecture:
 * Domain repository contract.
 * Implemented by infrastructure repositories.
 *
 * ⚠️ Important:
 * This interface must not expose Prisma-specific input or output types.
 *
 * 💡 Notes:
 * 🗄️ The database remembers everything.
 * The repository decides what should be asked.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { PaginatedResult } from '@api/shared';

import type { UpdateUserData } from '../types/update-user-data.type';
import type { UserRecord } from '../types/user-record.type';
import type { ListUsersOptions } from '../options';

export interface UsersRepository {
  findMany(options?: ListUsersOptions): Promise<PaginatedResult<UserRecord>>;

  findById(id: string): Promise<UserRecord | null>;

  findByEmail(email: string): Promise<UserRecord | null>;

  findByUsername(username: string): Promise<UserRecord | null>;

  findManyByIds(ids: string[]): Promise<UserRecord[]>;

  findPublicById(id: string): Promise<UserRecord | null>;

  findPublicByUsername(username: string): Promise<UserRecord | null>;

  updateById(id: string, data: UpdateUserData): Promise<UserRecord>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

/**
 * 🛰️ UsersRepository is a boundary, not a shortcut.
 * If Prisma leaks through here, the airlock failed.
 */
