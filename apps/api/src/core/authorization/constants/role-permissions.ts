/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/authorization/constants/role-permissions.ts
 * Purpose: Legacy fallback permissions for known system roles.
 * Phase: 2.4.5 — RBAC Core Migration
 * Architecture: Authorization compatibility layer
 */

import { Permission, type PermissionKey } from './permission.constants';

export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  user: [Permission.UsersRead],

  moderator: [
    Permission.UsersRead,
    Permission.UsersUpdate,
    Permission.RolesRead,
    Permission.PermissionsRead,
  ],

  admin: [
    Permission.UsersRead,
    Permission.UsersCreate,
    Permission.UsersUpdate,
    Permission.UsersDelete,

    Permission.RolesRead,
    Permission.RolesCreate,
    Permission.RolesUpdate,
    Permission.RolesDelete,

    Permission.PermissionsRead,
    Permission.PermissionsCreate,
    Permission.PermissionsUpdate,
    Permission.PermissionsDelete,
  ],

  owner: Object.values(Permission),
};
