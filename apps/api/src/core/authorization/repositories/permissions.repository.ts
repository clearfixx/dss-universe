/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: Authorization
 * 📄 File: permissions.repository.ts
 *
 * 🎯 Purpose:
 * Reads permission data from the database for authorization workflows.
 *
 * 🧠 Responsibilities:
 * • loads permission keys assigned to role names;
 * • isolates Prisma queries from authorization services;
 * • returns unique permission keys.
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
}
