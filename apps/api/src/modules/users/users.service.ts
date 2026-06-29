/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/users.service.ts
 *
 * 🎯 Purpose:
 * Provides user-related application operations.
 *
 * 🧠 Responsibilities:
 * • loads users by id;
 * • loads users by email for authentication flows;
 * • maps internal user records to safe public user objects.
 *
 * 🏗️ Architecture:
 * Users service. Owns module-level application logic and delegates persistence
 * to the UsersRepository contract.
 *
 * ⚠️ Important:
 * Do not expose passwordHash or refreshTokenHash from this service.
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
} from './interfaces/users.repository.interface';
import { UserNotFoundException } from './exceptions/user-not-found.exception';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async findById(id: string) {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new UserNotFoundException();
    }

    return UserMapper.toSafeUser(user);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }
}

/**
 * -----------------------------------------------------------------------------
 * 🧠 Business logic belongs here.
 * If it starts leaking into controllers, something is wrong.
 * -----------------------------------------------------------------------------
 */
