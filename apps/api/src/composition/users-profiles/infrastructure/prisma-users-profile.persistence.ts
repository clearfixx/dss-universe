/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Profile Composition
 * 📄 File: apps/api/src/composition/users-profiles/infrastructure/prisma-users-profile.persistence.ts
 *
 * 🎯 Purpose:
 * Assembles safe shared-row reads and profile update responses from explicit owner fragments.
 *
 * 🧠 Responsibilities:
 * • keeps single-query independent reads and the existing lazy batch rows/count transaction;
 * • binds Users profile, Auth presentation/state and IAM role predicates without copying their fields;
 * • returns only the sixteen supported display fields, with no credentials or post-update re-read.
 *
 * 🏗️ Architecture:
 * Root infrastructure behind the Users-owned semantic port; no generic query framework or new transaction settings.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  UsersProfilePersistence,
  ListUsersOptions,
  UpdateUserData,
} from '@api/modules/users';
import {
  usersProfileSelect,
  profileById,
  profileByUsername,
  profilesByIds,
  profileDirectoryQuery,
  profileUpdateData,
} from '@api/modules/users/infrastructure';
import {
  profileAccountSelect,
  profileAccountByEmail,
  activeProfileAccount,
  profileAccountState,
} from '@api/modules/auth/infrastructure';
import { profileDirectoryRole } from '@api/modules/iam/infrastructure';

const profileSelect = {
  ...usersProfileSelect,
  ...profileAccountSelect,
} as const;
@Injectable()
export class PrismaUsersProfilePersistence implements UsersProfilePersistence {
  constructor(private readonly prisma: PrismaService) {}
  findById(id: string) {
    return this.prisma.user.findUnique({
      where: profileById(id),
      select: profileSelect,
    });
  }
  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: profileAccountByEmail(email),
      select: profileSelect,
    });
  }
  findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: profileByUsername(username),
      select: profileSelect,
    });
  }
  findManyByIds(ids: string[]) {
    return this.prisma.user.findMany({
      where: { ...activeProfileAccount(), ...profilesByIds(ids) },
      select: profileSelect,
    });
  }
  findPublicById(id: string) {
    return this.prisma.user.findFirst({
      where: { ...profileById(id), ...activeProfileAccount() },
      select: profileSelect,
    });
  }
  findPublicByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { ...profileByUsername(username), ...activeProfileAccount() },
      select: profileSelect,
    });
  }
  async findMany(options: ListUsersOptions = {}) {
    const query = profileDirectoryQuery({
      pagination: options.pagination,
      search: options.search,
      sort: options.sort,
      userIds: options.userIds,
    });
    const where = {
      ...query.where,
      ...profileAccountState(options.status),
      ...profileDirectoryRole(options.role),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: query.orderBy,
        select: profileSelect,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
  updateById(id: string, data: UpdateUserData) {
    return this.prisma.user.update({
      where: profileById(id),
      data: profileUpdateData(data),
      select: profileSelect,
    });
  }
}
