/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🌱 Module: Database Seed
 * 📄 File: role-permissions.seed.ts
 *
 * 🎯 Purpose:
 * Assigns base permissions to system roles.
 *
 * 🧠 Responsibilities:
 * • maps system roles to permission keys;
 * • creates missing role-permission assignments;
 * • keeps seeded RBAC defaults predictable.
 *
 * 🏗️ Architecture:
 * Database seed.
 *
 * Role
 *   ↓
 * RolePermission
 *   ↓
 * Permission
 *
 * ⚠️ Important:
 * Backend checks permissions, not role names.
 *
 * 💡 Notes:
 * If you want `if (role === "admin")`,
 * drink coffee and add a permission instead. ☕
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
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
    Permission.MediaQuarantineManage,
    Permission.MediaLibraryRead,
    Permission.MediaJobsManage,
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
