/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/users.service.ts
 *
 * 🎯 Purpose:
 * Coordinates user-related application operations.
 *
 * 🧠 Responsibilities:
 * • loads users through the UsersRepository contract;
 * • throws domain-specific exceptions when users are missing;
 * • maps internal user records to safe public-facing users.
 *
 * 🏗️ Architecture:
 * Application service.
 * Depends on repository contracts, not Prisma or database details.
 *
 * ⚠️ Important:
 * Never expose UserRecord directly outside the application layer.
 *
 * 💡 Notes:
 * 🧠 Business logic belongs here.
 * If it starts leaking into controllers, something is wrong.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';

import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../domain/repositories/users.repository.interface';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import { UserMapper } from '../../domain/mappers/user.mapper';
import type { SafeUser } from '../../domain/types/safe-user.type';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async findById(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new UserNotFoundException();
    }

    return UserMapper.toSafeUser(user);
  }

  async findByEmail(email: string): Promise<SafeUser | null> {
    const user = await this.usersRepository.findByEmail(email);

    return user ? UserMapper.toSafeUser(user) : null;
  }

  async findByUsername(username: string): Promise<SafeUser | null> {
    const user = await this.usersRepository.findByUsername(username);

    return user ? UserMapper.toSafeUser(user) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.usersRepository.existsByEmail(email);
  }

  async existsByUsername(username: string): Promise<boolean> {
    return this.usersRepository.existsByUsername(username);
  }
}

/**
 * -----------------------------------------------------------------------------
 * 🧠 Business logic belongs here.
 * If it starts leaking into controllers, something is wrong.
 * -----------------------------------------------------------------------------
 */
