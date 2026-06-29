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
 * • loads users by id and email;
 * • creates users during registration;
 * • updates refresh token hashes for authentication sessions.
 *
 * 🏗️ Architecture:
 * Infrastructure repository. Implements the existing UsersRepository contract.
 *
 * ⚠️ Important:
 * This repository is still auth-compatible and returns Prisma User records.
 * Domain mapping will be introduced later during the repository refactor.
 *
 * 💡 Notes:
 * 🗄️ The database remembers everything.
 * The repository decides what should be asked.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { PrismaService } from '@api/core/database';

import { UsersRepository } from '../../interfaces/users.repository.interface';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }
}

/**
 * -----------------------------------------------------------------------------
 * 🗄️ The database remembers everything.
 * The repository decides what should be asked.
 * -----------------------------------------------------------------------------
 */
