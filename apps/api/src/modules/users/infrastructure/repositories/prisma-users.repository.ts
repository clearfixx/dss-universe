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
import { AuditWriterService } from '@api/core/audit';

import type { CreateUserContract } from '../../domain/contracts/create-user.contract';
import type { UpdateUserContract } from '../../domain/contracts/update-user.contract';
import type { UsersRepository } from '../../domain/repositories/users.repository.interface';
import type { UpdateUserData } from '../../domain/types/update-user-data.type';
import type { UserRecord } from '../../domain/types/user-record.type';
import type { ListUsersOptions } from '../../domain/options';
import type { PaginatedResult } from '@api/shared';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

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
        status: 'ACTIVE',
        id: {
          in: ids,
        },
      },
    });
  }

  async findRoleNamesByUserIds(
    userIds: string[],
  ): Promise<Map<string, string[]>> {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        role: { select: { name: true } },
      },
      orderBy: { assignedAt: 'asc' },
    });
    const result = new Map(userIds.map((userId) => [userId, [] as string[]]));
    for (const assignment of assignments) {
      result.get(assignment.userId)?.push(assignment.role.name);
    }
    return result;
  }

  async findPublicByUsername(username: string): Promise<UserRecord | null> {
    return this.prisma.user.findFirst({
      where: {
        username,
        status: 'ACTIVE',
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
    return this.prisma.$transaction(async (transaction) => {
      const defaultRole = await transaction.role.findUniqueOrThrow({
        where: { name: 'user' },
        select: { id: true },
      });
      const user = await transaction.user.create({ data });
      await transaction.userRole.create({
        data: {
          userId: user.id,
          roleId: defaultRole.id,
        },
      });
      return user;
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

  async deactivateAccount(userId: string): Promise<UserRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const user = await transaction.user.update({
        where: { id: userId },
        data: {
          status: 'DEACTIVATED',
          deactivatedAt: now,
          refreshTokenHash: null,
        },
      });
      await transaction.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.audit.append(transaction, {
        action: 'user.account.deactivated',
        actorType: 'USER',
        actorId: userId,
        targetType: 'User',
        targetId: userId,
      });
      return user;
    });
  }

  async reactivateAccount(userId: string): Promise<UserRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        where: { id: userId, status: 'DEACTIVATED' },
        data: {
          status: 'ACTIVE',
          deactivatedAt: null,
          refreshTokenHash: null,
        },
      });
      await this.audit.append(transaction, {
        action: 'user.account.reactivated',
        actorType: 'USER',
        actorId: userId,
        targetType: 'User',
        targetId: userId,
      });
      return user;
    });
  }

  async changeEmail(userId: string, email: string): Promise<UserRecord> {
    return this.changeCredentials(
      userId,
      {
        email,
        emailVerifiedAt: null,
        authVersion: { increment: 1 },
      },
      'user.account.email_changed',
    );
  }

  async changePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<UserRecord> {
    return this.changeCredentials(
      userId,
      {
        passwordHash,
        authVersion: { increment: 1 },
      },
      'user.account.password_changed',
    );
  }

  async findMany(
    options: ListUsersOptions = {},
  ): Promise<PaginatedResult<UserRecord>> {
    const page = options.pagination?.page ?? 1;
    const limit = options.pagination?.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = options.search?.trim();
    const where: Prisma.UserWhereInput = {
      status: options.status,
      ...(options.userIds ? { id: { in: options.userIds } } : {}),
      ...(options.role
        ? {
            roles: {
              some: {
                role: {
                  name: { equals: options.role, mode: 'insensitive' },
                },
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { displayName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.toOrderBy(options.sort),
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private toOrderBy(
    sort: ListUsersOptions['sort'],
  ): Prisma.UserOrderByWithRelationInput[] {
    switch (sort) {
      case 'OLDEST':
        return [{ createdAt: 'asc' }, { id: 'asc' }];
      case 'USERNAME_ASC':
        return [{ username: 'asc' }, { id: 'asc' }];
      case 'USERNAME_DESC':
        return [{ username: 'desc' }, { id: 'asc' }];
      case 'LAST_ACTIVE':
        return [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }];
      case 'NEWEST':
      default:
        return [{ createdAt: 'desc' }, { id: 'asc' }];
    }
  }

  private async changeCredentials(
    userId: string,
    data: Prisma.UserUpdateInput,
    action: string,
  ): Promise<UserRecord> {
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const user = await transaction.user.update({
        where: { id: userId, status: 'ACTIVE' },
        data: { ...data, refreshTokenHash: null },
      });
      await transaction.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.audit.append(transaction, {
        action,
        actorType: 'USER',
        actorId: userId,
        targetType: 'User',
        targetId: userId,
      });
      return user;
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
