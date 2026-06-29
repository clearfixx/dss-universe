/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Safety
 * 📄 File: iam-safety.service.ts
 *
 * 🎯 Purpose:
 * Protects critical IAM entities from unsafe mutations.
 *
 * 🧠 Responsibilities:
 * • prevents protected system roles from deletion;
 * • prevents unsafe renaming of critical roles;
 * • centralizes IAM safety checks.
 *
 * 🏗️ Architecture:
 * IAM safety service.
 *
 * RolesService
 *   ↓
 * IamSafetyService
 *   ↓
 * Safety rules
 *
 * ⚠️ Important:
 * Safety rules should be explicit and boring.
 * Boring security is good security.
 *
 * 💡 Notes:
 * Roles are boring until someone deletes admin.
 * That is why this file exists. 🛡️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException, Injectable } from '@nestjs/common';

import type { ProtectedRole } from './types/protected-role.type';

@Injectable()
export class IamSafetyService {
  private readonly protectedRoles: ProtectedRole[] = [
    {
      name: 'admin',
      reason: 'The admin role is required to keep DSS Universe controllable.',
    },
    {
      name: 'super_admin',
      reason: 'The super_admin role protects the highest level of access.',
    },
  ];

  assertRoleCanBeDeleted(roleName: string): void {
    const protectedRole = this.findProtectedRole(roleName);

    if (protectedRole) {
      throw new BadRequestException(
        `Role "${roleName}" cannot be deleted. Reason: ${protectedRole.reason}`,
      );
    }
  }

  assertRoleCanBeRenamed(currentRoleName: string): void {
    const protectedRole = this.findProtectedRole(currentRoleName);

    if (protectedRole) {
      throw new BadRequestException(
        `Role "${currentRoleName}" cannot be renamed. Reason: ${protectedRole.reason}`,
      );
    }
  }

  assertLastAdminRoleIsNotRemoved(params: {
    roleName: string;
    adminsWithRoleCount: number;
  }): void {
    const { roleName, adminsWithRoleCount } = params;

    const normalizedRoleName = this.normalizeRoleName(roleName);

    if (
      normalizedRoleName !== 'admin' &&
      normalizedRoleName !== 'super_admin'
    ) {
      return;
    }

    if (adminsWithRoleCount <= 1) {
      throw new BadRequestException(
        `Cannot remove the last user with role "${roleName}". DSS needs at least one captain on the bridge. 🧑‍🚀`,
      );
    }
  }

  assertSystemRoleCanBeModified(params: {
    roleName: string;
    isSystem: boolean;
  }): void {
    const { roleName, isSystem } = params;

    if (!isSystem) {
      return;
    }

    throw new BadRequestException(
      `System role "${roleName}" cannot be modified directly.`,
    );
  }

  private findProtectedRole(roleName: string): ProtectedRole | undefined {
    const normalizedRoleName = this.normalizeRoleName(roleName);

    return this.protectedRoles.find(
      (role) => this.normalizeRoleName(role.name) === normalizedRoleName,
    );
  }

  private normalizeRoleName(roleName: string): string {
    return roleName.trim().toLowerCase();
  }
}
