import { UserRole } from '@prisma/client';

import { Permission, PermissionKey } from '../enums/permission.registry';

export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  [UserRole.USER]: [Permission.UsersRead],

  [UserRole.MODERATOR]: [
    Permission.UsersRead,
    Permission.UsersUpdate,
    Permission.UsersBan,

    Permission.RolesRead,

    Permission.PermissionsRead,
  ],

  [UserRole.ADMIN]: [
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

  [UserRole.OWNER]: [...Object.values(Permission)],
};
