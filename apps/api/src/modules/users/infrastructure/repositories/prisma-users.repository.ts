/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-users.repository.ts
 *
 * 🎯 Purpose:
 * Implements user persistence using Prisma.
 *
 * 🧠 Responsibilities:
 * • loads users by id, email, and username;
 * • checks whether user email or username already exists;
 * • creates and updates user records;
 * • updates refresh token hashes for authentication sessions;
 * • deletes user records when explicitly requested.
 *
 * 🏗️ Architecture:
 * Infrastructure repository.
 * Implements the UsersRepository domain contract and hides Prisma behind it.
 *
 * ⚠️ Important:
 * This repository returns internal UserRecord objects.
 * Controllers must never expose UserRecord directly because it contains sensitive fields.
 *
 * 💡 Notes:
 * 🗄️ The database remembers everything.
 * The repository decides what should be asked.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { PrismaService } from '@api/core/database';

import type { CreateUserContract } from '../../domain/contracts/create-user.contract';
import type { UpdateUserContract } from '../../domain/contracts/update-user.contract';
import type { UsersRepository } from '../../domain/repositories/users.repository.interface';
import type { UpdateUserData } from '../../domain/types/update-user-data.type';
import type { UserRecord } from '../../domain/types/user-record.type';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByUsername(username: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findManyByIds(ids: string[]): Promise<UserRecord[]> {
    return this.prisma.user.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async findPublicByUsername(username: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: {
        username,
      },
    });
  }

  async updateById(id: string, data: UpdateUserData): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });

    return count > 0;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { username },
    });

    return count > 0;
  }

  create(data: CreateUserContract): Promise<UserRecord> {
    return this.prisma.user.create({
      data,
    });
  }

  update(id: string, data: UpdateUserContract): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }
}

/**
 * -----------------------------------------------------------------------------
 * 🗄️ The database remembers everything.
 * The repository decides what should be asked.
 * -----------------------------------------------------------------------------
 */
