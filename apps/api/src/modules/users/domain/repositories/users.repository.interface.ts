/**
 * 📄 File: apps/api/src/modules/users/domain/repositories/users.repository.interface.ts
 *
 * 🧠 Users Repository Contract
 *
 * This interface defines the persistence boundary for the Users module.
 * Services depend on this contract, not on Prisma, SQL, or any specific database.
 *
 * Architecture:
 * Controller → Service → UsersRepository → Infrastructure → PrismaService
 */

import type { CreateUserContract } from '../contracts/create-user.contract';
import type { UpdateUserContract } from '../contracts/update-user.contract';
import type { UpdateUserData } from '../types/update-user-data.type';
import type { UserRecord } from '../types/user-record.type';

export interface UsersRepository {
  findById(id: string): Promise<UserRecord | null>;

  updateById(id: string, data: UpdateUserData): Promise<UserRecord>;

  findByEmail(email: string): Promise<UserRecord | null>;

  findByUsername(username: string): Promise<UserRecord | null>;

  create(data: CreateUserContract): Promise<UserRecord>;

  update(id: string, data: UpdateUserContract): Promise<UserRecord>;

  updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<UserRecord>;

  existsByUsername(username: string): Promise<boolean>;

  existsByEmail(email: string): Promise<boolean>;

  existsByUsername(username: string): Promise<boolean>;

  delete(id: string): Promise<void>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
