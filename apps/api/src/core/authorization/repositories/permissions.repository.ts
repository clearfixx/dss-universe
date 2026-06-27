/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: permissions.repository.ts
 *
 * 🎯 Purpose:
 * Repository для читання permission'ів із бази даних.
 *
 * 🗄️ Database:
 * Role
 *   ↓
 * RolePermission
 *   ↓
 * Permission
 *
 * 🧠 Design Decisions:
 * PermissionsService не працює напряму з Prisma.
 * Уся database-логіка живе тут.
 *
 * ⚠️ Don't:
 * Не додавай сюди бізнес-логіку доступу.
 * Repository питає базу. Service приймає рішення.
 *
 * 🛸 Якщо цей файл почав вирішувати, кому що можна —
 * він захопив владу. Зупини його. 😄
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
