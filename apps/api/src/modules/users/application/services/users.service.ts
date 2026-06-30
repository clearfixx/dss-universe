/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/application/services/users.service.ts
 *
 * 🎯 Purpose:
 * Coordinates user-related business operations and exposes a safe API
 * for other modules.
 *
 * 🧠 Responsibilities:
 * • reads users through the repository abstraction;
 * • converts user records into safe public user objects;
 * • throws domain-level exceptions when users are not found.
 *
 * 🏗️ Architecture:
 * Application service. Owns business logic. Does not know about HTTP
 * and does not access Prisma directly.
 *
 * ⚠️ Important:
 * Other modules should use UsersService instead of accessing the users
 * repository or Prisma directly.
 *
 * 💡 Notes:
 * 🧠 Business logic belongs here.
 * If it starts leaking into controllers, something is wrong.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserStatus } from '@prisma/client';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import { UserMapper } from '../../domain/mappers/user.mapper';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../domain/repositories/users.repository.interface';
import type { UserRecord } from '../../domain/types/user-record.type';
import type { SafeUser } from '../../domain/types/safe-user.type';
import type { UpdateUserProfileData } from '../types/update-user-profile-data.type';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async getById(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.findById(id);

    return this.toSafeUser(this.requireUser(user));
  }

  async getByEmail(email: string): Promise<SafeUser> {
    const user = await this.usersRepository.findByEmail(email);

    return this.toSafeUser(this.requireUser(user));
  }

  async getByUsername(username: string): Promise<SafeUser> {
    const user = await this.usersRepository.findByUsername(username);

    return this.toSafeUser(this.requireUser(user));
  }

  async exists(id: string): Promise<boolean> {
    const user = await this.usersRepository.findById(id);

    return Boolean(user);
  }

  async findRecordById(id: string): Promise<UserRecord | null> {
    return this.usersRepository.findById(id);
  }

  async findRecordByEmail(email: string): Promise<UserRecord | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findRecordByUsername(username: string): Promise<UserRecord | null> {
    return this.usersRepository.findByUsername(username);
  }

  async markLastSeen(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.updateById(id, {
      lastSeenAt: new Date(),
    });

    return this.toSafeUser(user);
  }

  async markEmailVerified(id: string): Promise<SafeUser> {
    const user = await this.usersRepository.updateById(id, {
      emailVerifiedAt: new Date(),
    });

    return this.toSafeUser(user);
  }

  async changePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<SafeUser> {
    const user = await this.usersRepository.updateById(id, {
      passwordHash,
    });

    return this.toSafeUser(user);
  }

  async updateProfile(
    id: string,
    profile: UpdateUserProfileData,
  ): Promise<SafeUser> {
    const user = await this.usersRepository.updateById(id, {
      displayName: profile.displayName,
      bio: profile.bio,
    });

    return this.toSafeUser(user);
  }

  async changeAvatar(id: string, avatarUrl: string | null): Promise<SafeUser> {
    const user = await this.usersRepository.updateById(id, {
      avatarUrl,
    });

    return this.toSafeUser(user);
  }

  async changeCover(id: string, coverUrl: string | null): Promise<SafeUser> {
    const user = await this.usersRepository.updateById(id, {
      coverUrl,
    });

    return this.toSafeUser(user);
  }
  async changeStatus(id: string, status: UserStatus): Promise<SafeUser> {
    const user = await this.usersRepository.updateById(id, {
      status,
    });

    return this.toSafeUser(user);
  }

  private requireUser(user: UserRecord | null): UserRecord {
    if (!user) {
      throw new UserNotFoundException();
    }

    return user;
  }

  toSafeUser(user: UserRecord): SafeUser {
    return UserMapper.toSafeUser(user);
  }
}

/**
 * 🛰️ UsersService is the airlock between user data and the rest of DSS.
 * Raw records stay inside. Safe users may leave the station.
 */
