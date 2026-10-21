/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/user-access/user-access.service.ts
 *
 * 🎯 Purpose:
 * Coordinates user role and direct permission assignments.
 *
 * 🧠 Responsibilities:
 * • returns user access summaries;
 * • grants roles to users;
 * • revokes roles from users;
 * • grants direct permissions to users;
 * • revokes direct permissions from users;
 * • calculates effective permissions.
 * • delegates role revocation to an atomic, policy-checked persistence capability.
 *
 * 🏗️ Architecture:
 * IAM business service.
 *
 * UserAccessController
 *   ↓
 * UserAccessService
 *   ↓
 * Prisma
 *
 * ⚠️ Important:
 * Effective permissions combine role permissions and direct permissions.
 * Role revocation checks the final protected holder inside the owned transaction.
 *
 * 💡 Notes:
 * This service answers:
 * "What access does this user actually have?" 🧭
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GrantUserPermissionDto } from './dto/grant-user-permission.dto';
import type { GrantUserRoleDto } from './dto/grant-user-role.dto';
import type { UserAccessSummary } from './types/user-access-summary.type';
import { IamSafetyService } from '../safety';
import {
  IAM_ROLE_REVOCATION_REPOSITORY,
  type RoleRevocationRepository,
} from './contracts/role-revocation.repository.interface';
import {
  IAM_SUBJECT_ACCESS_REPOSITORY,
  type SubjectAccessRepository,
} from './contracts/subject-access.repository.interface';

@Injectable()
export class UserAccessService {
  constructor(
    @Inject(IAM_SUBJECT_ACCESS_REPOSITORY)
    private readonly access: SubjectAccessRepository,
    @Inject(IAM_ROLE_REVOCATION_REPOSITORY)
    private readonly roleRevocations: RoleRevocationRepository,
    private readonly safety: IamSafetyService,
  ) {}

  async getSummary(userId: string): Promise<UserAccessSummary> {
    const assignments = await this.access.findAssignments(userId);
    if (!assignments)
      throw new NotFoundException(`User with id "${userId}" was not found.`);
    const rolePermissions = assignments.roles.flatMap(
      ({ permissionKeys }) => permissionKeys,
    );
    const directPermissionKeys = assignments.directPermissions.map(
      ({ key }) => key,
    );
    return {
      userId: assignments.subjectId,
      roles: assignments.roles.map(({ id, name }) => ({ id, name })),
      directPermissions: assignments.directPermissions.map(({ id, key }) => ({
        id,
        name: key,
      })),
      effectivePermissions: Array.from(
        new Set<string>([...rolePermissions, ...directPermissionKeys]),
      ).sort(),
    };
  }

  async grantRole(
    userId: string,
    dto: GrantUserRoleDto,
  ): Promise<UserAccessSummary> {
    await this.assertUserExists(userId);
    await this.assertRoleExists(dto.roleId);
    if (await this.access.hasRole(userId, dto.roleId)) {
      throw new ConflictException('Role is already assigned to this user.');
    }
    await this.access.grantRole(userId, dto.roleId);
    return this.getSummary(userId);
  }

  async revokeRole(userId: string, roleId: string): Promise<UserAccessSummary> {
    const result = await this.roleRevocations.revoke(
      userId,
      roleId,
      (state) => {
        this.safety.assertLastAdminRoleIsNotRemoved(state);
        return undefined;
      },
    );
    if (result === 'subject-not-found') {
      throw new NotFoundException(`User with id "${userId}" was not found.`);
    }
    if (result === 'role-not-found') {
      throw new NotFoundException(`Role with id "${roleId}" was not found.`);
    }
    if (result === 'assignment-not-found') {
      throw new NotFoundException('Role assignment was not found.');
    }
    return this.getSummary(userId);
  }

  async grantPermission(
    userId: string,
    dto: GrantUserPermissionDto,
  ): Promise<UserAccessSummary> {
    await this.assertUserExists(userId);
    await this.assertPermissionExists(dto.permissionId);
    if (await this.access.hasDirectPermission(userId, dto.permissionId)) {
      throw new ConflictException(
        'Permission is already directly assigned to this user.',
      );
    }
    await this.access.grantPermission(userId, dto.permissionId);
    return this.getSummary(userId);
  }

  async revokePermission(
    userId: string,
    permissionId: string,
  ): Promise<UserAccessSummary> {
    await this.assertUserExists(userId);
    await this.assertPermissionExists(permissionId);
    if (!(await this.access.hasDirectPermission(userId, permissionId))) {
      throw new NotFoundException(
        'Direct permission assignment was not found.',
      );
    }
    await this.access.revokePermission(userId, permissionId);
    return this.getSummary(userId);
  }

  private async assertUserExists(userId: string): Promise<void> {
    if (!(await this.access.subjectExists(userId)))
      throw new NotFoundException(`User with id "${userId}" was not found.`);
  }
  private async assertRoleExists(roleId: string): Promise<void> {
    if (!(await this.access.roleExists(roleId)))
      throw new NotFoundException(`Role with id "${roleId}" was not found.`);
  }
  private async assertPermissionExists(permissionId: string): Promise<void> {
    if (!(await this.access.permissionExists(permissionId)))
      throw new NotFoundException(
        `Permission with id "${permissionId}" was not found.`,
      );
  }
}
