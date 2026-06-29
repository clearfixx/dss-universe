/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/authorization/constants/permission.constants.ts
 * Purpose: Central permission registry for DSS authorization.
 * Phase: 2.4.5 — RBAC Core Migration
 * Architecture: Authorization constants
 */

export const Permission = {
  UsersRead: 'users.read',
  UsersCreate: 'users.create',
  UsersUpdate: 'users.update',
  UsersDelete: 'users.delete',

  RolesRead: 'roles.read',
  RolesCreate: 'roles.create',
  RolesUpdate: 'roles.update',
  RolesDelete: 'roles.delete',

  PermissionsRead: 'permissions.read',
  PermissionsCreate: 'permissions.create',
  PermissionsUpdate: 'permissions.update',
  PermissionsDelete: 'permissions.delete',
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];
