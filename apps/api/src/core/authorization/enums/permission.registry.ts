/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: Authorization
 * 📄 File: permission.registry.ts
 *
 * 🎯 Purpose:
 * Defines the central permission registry for DSS Universe.
 *
 * 🧠 Responsibilities:
 * • stores all known backend permission keys;
 * • provides labels and descriptions for seeded permissions;
 * • exposes typed permission helpers for guards, seeds, and controllers.
 *
 * 🏗️ Architecture:
 * Authorization registry.
 *
 * Permission Registry
 *   ↓
 * Seed
 *   ↓
 * Database
 *   ↓
 * JWT effective permissions
 *   ↓
 * PermissionsGuard
 *
 * ⚠️ Important:
 * Permission is not a role.
 * Permission is the concrete action backend allows or denies.
 *
 * 💡 Notes:
 * Role = rank.
 * Permission = real key to the door. 🔑
 *
 * 🚀 Build. Share. Grow.
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

  MediaRestrictedRead: {
    key: 'media.restricted.read',
    label: 'Read restricted media',
    description: 'Allows access to restricted media owned by other users.',
  },
  MediaQuarantineManage: {
    key: 'media.quarantine.manage',
    label: 'Manage media quarantine',
    description:
      'Allows reviewing, rescanning, and rejecting quarantined media.',
  },
  MediaLibraryRead: {
    key: 'media.library.read',
    label: 'Read Media Library',
    description: 'Allows browsing Media Library records and storage metrics.',
  },
  MediaJobsManage: {
    key: 'media.jobs.manage',
    label: 'Manage media jobs',
    description: 'Allows retrying failed Media processing jobs.',
  },

  ReputationReverse: {
    key: 'reputation.reverse',
    label: 'Reverse reputation',
    description: 'Allows reversing direct reputation entries.',
  },
  ReputationSettingsManage: {
    key: 'reputation.settings.manage',
    label: 'Manage reputation settings',
    description: 'Allows updating Reputation policy settings.',
  },
  CommunityPointsReverse: {
    key: 'community-points.reverse',
    label: 'Reverse Community Points',
    description: 'Allows appending compensating Community Points reversals.',
  },
  CommunityPointsSettingsManage: {
    key: 'community-points.settings.manage',
    label: 'Manage Community Points settings',
    description:
      'Allows updating Community Points rules and anti-abuse limits.',
  },
  LevelsSettingsManage: {
    key: 'levels.settings.manage',
    label: 'Manage level settings',
    description:
      'Allows creating and updating Community Points level thresholds.',
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
