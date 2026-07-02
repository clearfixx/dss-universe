/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: Authorization
 * 📄 File: apps/api/src/core/authorization/services/permissions.service.ts
 *
 * 🎯 Purpose:
 * Provides permission-checking helpers and access-profile loading
 * for authorization workflows.
 *
 * 🧠 Responsibilities:
 * • loads permission keys for role names through the repository;
 * • loads effective user roles and permissions;
 * • checks whether a permission set satisfies required permissions;
 * • keeps authorization decision helpers outside guards and controllers.
 *
 * 🏗️ Architecture:
 * Authorization service.
 *
 * PermissionsService
 *   ↓
 * PermissionsRepository
 *   ↓
 * Prisma
 *
 * ⚠️ Important:
 * Access-token generation depends on the access profile contract returned here.
 *
 * 💡 Notes:
 * If you want to write `if (user.role === "admin")`,
 * drink coffee and add a permission instead. ☕
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import type { PermissionKey } from '../enums/permission.registry';
import { PermissionsRepository } from '../repositories/permissions.repository';
import type { UserAccessProfile } from '../types/user-access-profile.type';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async getPermissionsByRoleNames(roleNames: string[]): Promise<string[]> {
    return this.permissionsRepository.findPermissionKeysByRoleNames(roleNames);
  }

  async getAccessProfileByUserId(userId: string): Promise<UserAccessProfile> {
    return this.permissionsRepository.findAccessProfileByUserId(userId);
  }

  async hasAllPermissions(
    roleNames: string[],
    requiredPermissions: PermissionKey[],
  ): Promise<boolean> {
    const permissions = await this.getPermissionsByRoleNames(roleNames);

    return requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );
  }

  async hasAnyPermission(
    roleNames: string[],
    requiredPermissions: PermissionKey[],
  ): Promise<boolean> {
    const permissions = await this.getPermissionsByRoleNames(roleNames);

    return requiredPermissions.some((permission) =>
      permissions.includes(permission),
    );
  }
}
