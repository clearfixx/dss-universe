/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Database Seed
 * 📄 File: role-permissions.seed.ts
 *
 * 🎯 Purpose:
 * Прив'язує permission'и до базових системних ролей.
 *
 * 🧠 Architecture:
 * Role
 *   ↓
 * RolePermission
 *   ↓
 * Permission
 *
 * ⚠️ Important:
 * Backend перевіряє permission'и, а не назву ролі.
 *
 * 💡 Якщо хочеться написати if (role === 'ADMIN'),
 * значить час випити каву і повернутися до permission'ів. ☕
 * ===============================================================
 */

/**
 * DSS File Passport 🛰️
 * File: apps/api/prisma/seed/role-permissions.seed.ts
 * Purpose: Assigns base permissions to system roles.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: Database seed
 *
 * Notes:
 * - Backend checks permissions, not role names.
 * - Role names are lowercase identifiers.
 * - If you want `if (role === "ADMIN")`, drink coffee and walk away. ☕
 */

import { PrismaClient } from '@prisma/client';

import {
  Permission,
  PERMISSION_LIST,
  type PermissionKey,
} from '../../src/core/authorization';

const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  user: [Permission.UsersRead],

  moderator: [
    Permission.UsersRead,
    Permission.UsersUpdate,
    Permission.UsersBan,

    Permission.RolesRead,

    Permission.PermissionsRead,
  ],

  admin: [
    Permission.UsersRead,
    Permission.UsersCreate,
    Permission.UsersUpdate,
    Permission.UsersDelete,
    Permission.UsersBan,

    Permission.RolesRead,
    Permission.RolesCreate,
    Permission.RolesUpdate,
    Permission.RolesDelete,

    Permission.PermissionsRead,
    Permission.PermissionsManage,

    Permission.SystemSettingsRead,
    Permission.SystemSettingsUpdate,
  ],

  owner: PERMISSION_LIST.map((permission) => permission.key),
};

export async function seedRolePermissions(prisma: PrismaClient): Promise<void> {
  console.log('Seeding role permissions...');

  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({
      where: {
        name: roleName,
      },
    });

    if (!role) {
      console.warn(`Role not found: ${roleName}`);
      continue;
    }

    for (const permissionKey of permissionKeys) {
      const permission = await prisma.permission.findUnique({
        where: {
          key: permissionKey,
        },
      });

      if (!permission) {
        console.warn(`Permission not found: ${permissionKey}`);
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log('Role permissions seeded');
}
