/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: Authorization
 * 📄 File: apps/api/src/core/authorization/repositories/permissions.repository.ts
 *
 * 🎯 Purpose:
 * Reads authorization data from the database for permission workflows
 * and access-token profile generation.
 *
 * 🧠 Responsibilities:
 * • loads permission keys assigned to role names;
 * • loads effective user roles and permissions;
 * • isolates Prisma queries from authorization services;
 * • returns normalized authorization data.
 *
 * 🏗️ Architecture:
 * Authorization repository.
 *
 * PermissionsService
 *   ↓
 * PermissionsRepository
 *   ↓
 * Prisma
 *
 * ⚠️ Important:
 * Do not add business access decisions here.
 * Repository asks the database. Service decides.
 *
 * 💡 Notes:
 * The database remembers everything.
 * The repository decides what should be asked. 🗄️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { PrismaService } from '@api/core/database';

import type { UserAccessProfile } from '../types/user-access-profile.type';

@Injectable()
export class PermissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPermissionKeysByRoleNames(roleNames: string[]): Promise<string[]> {
    if (!roleNames.length) {
      return [];
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        role: {
          name: {
            in: roleNames,
          },
        },
      },
      select: {
        permission: {
          select: {
            key: true,
          },
        },
      },
    });

    const permissionKeys = rolePermissions.map(
      (rolePermission) => rolePermission.permission.key,
    );

    return [...new Set<string>(permissionKeys)];
  }

  async findAccessProfileByUserId(userId: string): Promise<UserAccessProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          select: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        key: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        directPermissions: {
          select: {
            permission: {
              select: {
                key: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return {
        roles: [],
        permissions: [],
      };
    }

    const roles = user.roles.map(({ role }) => role.name);

    const rolePermissions = user.roles.flatMap(({ role }) =>
      role.permissions.map(({ permission }) => permission.key),
    );

    const directPermissions = user.directPermissions.map(
      ({ permission }) => permission.key,
    );

    return {
      roles: [...new Set<string>(roles)],
      permissions: [
        ...new Set<string>([...rolePermissions, ...directPermissions]),
      ],
    };
  }
}
