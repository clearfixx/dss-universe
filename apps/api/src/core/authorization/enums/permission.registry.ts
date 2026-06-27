/**
 * ===============================================================
 * 🛰️ DSS Universe Permission Registry
 * ---------------------------------------------------------------
 * Єдине джерело правди для всіх permission'ів системи.
 *
 * 🧠 Архітектурна примітка:
 * Permission — це не роль.
 * Permission — це конкретна дія, яку backend дозволяє або забороняє.
 *
 * 🎖️ Роль = "погон".
 * 🔑 Permission = реальний ключ від дверей.
 *
 * Якщо хочеться написати if (user.role === 'ADMIN') —
 * зроби чай, видихни, і додай permission. 😄
 * ===============================================================
 */

export const PERMISSIONS = {
  UsersRead: {
    key: 'users.read',
    label: 'Read users',
    description: 'Allows viewing user accounts.',
  },
  UsersCreate: {
    key: 'users.create',
    label: 'Create users',
    description: 'Allows creating user accounts.',
  },
  UsersUpdate: {
    key: 'users.update',
    label: 'Update users',
    description: 'Allows updating user accounts.',
  },
  UsersDelete: {
    key: 'users.delete',
    label: 'Delete users',
    description: 'Allows deleting user accounts.',
  },
  UsersBan: {
    key: 'users.ban',
    label: 'Ban users',
    description: 'Allows banning or restricting user accounts.',
  },

  RolesRead: {
    key: 'roles.read',
    label: 'Read roles',
    description: 'Allows viewing roles.',
  },
  RolesCreate: {
    key: 'roles.create',
    label: 'Create roles',
    description: 'Allows creating roles.',
  },
  RolesUpdate: {
    key: 'roles.update',
    label: 'Update roles',
    description: 'Allows updating roles.',
  },
  RolesDelete: {
    key: 'roles.delete',
    label: 'Delete roles',
    description: 'Allows deleting roles.',
  },

  PermissionsRead: {
    key: 'permissions.read',
    label: 'Read permissions',
    description: 'Allows viewing permissions.',
  },
  PermissionsManage: {
    key: 'permissions.manage',
    label: 'Manage permissions',
    description: 'Allows managing permission assignments.',
  },

  SystemSettingsRead: {
    key: 'system.settings.read',
    label: 'Read system settings',
    description: 'Allows viewing system settings.',
  },
  SystemSettingsUpdate: {
    key: 'system.settings.update',
    label: 'Update system settings',
    description: 'Allows updating system settings.',
  },
} as const;

export type PermissionName = keyof typeof PERMISSIONS;

export type PermissionKey =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS]['key'];

export const Permission = Object.fromEntries(
  Object.entries(PERMISSIONS).map(([name, permission]) => [
    name,
    permission.key,
  ]),
) as Record<PermissionName, PermissionKey>;

export const PERMISSION_LIST = Object.values(PERMISSIONS);
