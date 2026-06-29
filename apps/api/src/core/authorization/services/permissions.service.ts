/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: Authorization
 * 📄 File: permissions.service.ts
 *
 * 🎯 Purpose:
 * Provides permission-checking helpers for authorization workflows.
 *
 * 🧠 Responsibilities:
 * • loads permission keys for role names through the repository;
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
 * New HTTP request authorization should prefer JWT effective permissions.
 * This service remains useful for internal checks, admin tools, and future audits.
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

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async getPermissionsByRoleNames(roleNames: string[]): Promise<string[]> {
    return this.permissionsRepository.findPermissionKeysByRoleNames(roleNames);
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
