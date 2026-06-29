/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/roles/roles.service.ts
 * Purpose: Business logic for role management.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: IAM service
 *
 * Notes:
 * - Roles are boring until someone deletes admin.
 * - That is why Safety exists. ☕
 */

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../core/database';

import type { CreateRoleDto } from './dto/create-role.dto';
import type { AssignRoleDto } from './dto/assign-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { IamSafetyService } from '../safety';
import type { RoleWithPermissions } from './types/role-with-permissions.type';

const roleWithPermissionsSelect = {
  id: true,
  name: true,
  label: true,
  description: true,
  isSystem: true,
  permissions: {
    select: {
      permission: {
        select: {
          id: true,
          key: true,
          label: true,
          description: true,
        },
      },
    },
    orderBy: {
      permission: {
        key: 'asc',
      },
    },
  },
} satisfies Prisma.RoleSelect;

type RoleWithPermissionsPayload = Prisma.RoleGetPayload<{
  select: typeof roleWithPermissionsSelect;
}>;

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly iamSafetyService: IamSafetyService,
  ) {}

  async create(dto: CreateRoleDto): Promise<RoleWithPermissions> {
    const existingRole = await this.prisma.role.findUnique({
      where: { name: dto.name },
      select: { id: true },
    });

    if (existingRole) {
      throw new ConflictException(`Role "${dto.name}" already exists.`);
    }

    if (dto.permissionIds?.length) {
      await this.assertPermissionsExist(dto.permissionIds);
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        label: dto.label,
        description: dto.description,
        permissions: dto.permissionIds?.length
          ? {
              create: dto.permissionIds.map((permissionId) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      select: roleWithPermissionsSelect,
    });

    return this.mapRole(role);
  }

  async findAll(): Promise<RoleWithPermissions[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: roleWithPermissionsSelect,
    });

    return roles.map((role) => this.mapRole(role));
  }

  async findOne(id: string): Promise<RoleWithPermissions> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: roleWithPermissionsSelect,
    });

    if (!role) {
      throw new NotFoundException(`Role with id "${id}" was not found.`);
    }

    return this.mapRole(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleWithPermissions> {
    const role = await this.assertRoleExists(id);

    if (role.isSystem) {
      this.iamSafetyService.assertSystemRoleCanBeModified({
        roleName: role.name,
        isSystem: role.isSystem,
      });
    }

    if (dto.name && dto.name !== role.name) {
      this.iamSafetyService.assertRoleCanBeRenamed(role.name);
      await this.assertRoleNameIsAvailable(dto.name, id);
    }

    const updatedRole = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        label: dto.label,
        description: dto.description,
      },
      select: roleWithPermissionsSelect,
    });

    return this.mapRole(updatedRole);
  }

  async remove(id: string) {
    const role = await this.assertRoleExists(id);

    this.iamSafetyService.assertRoleCanBeDeleted(role.name);

    if (role.isSystem) {
      this.iamSafetyService.assertSystemRoleCanBeModified({
        roleName: role.name,
        isSystem: role.isSystem,
      });
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return {
      deleted: true,
      role,
    };
  }

  async assignPermission(
    roleId: string,
    dto: AssignRoleDto,
  ): Promise<RoleWithPermissions> {
    await this.assertRoleExists(roleId);
    await this.assertPermissionExists(dto.permissionId);

    const existingAssignment = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: dto.permissionId,
        },
      },
      select: {
        roleId: true,
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        'Permission is already assigned to this role.',
      );
    }

    await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId: dto.permissionId,
      },
    });

    return this.findOne(roleId);
  }

  async revokePermission(
    roleId: string,
    permissionId: string,
  ): Promise<RoleWithPermissions> {
    await this.assertRoleExists(roleId);
    await this.assertPermissionExists(permissionId);

    const existingAssignment = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      select: {
        roleId: true,
      },
    });

    if (!existingAssignment) {
      throw new NotFoundException(
        'Permission assignment was not found for this role.',
      );
    }

    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    return this.findOne(roleId);
  }

  private async assertRoleExists(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        label: true,
        description: true,
        isSystem: true,
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with id "${id}" was not found.`);
    }

    return role;
  }

  private async assertPermissionExists(id: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" was not found.`);
    }
  }

  private async assertPermissionsExist(permissionIds: string[]): Promise<void> {
    const uniquePermissionIds = [...new Set(permissionIds)];

    const existingPermissions = await this.prisma.permission.findMany({
      where: {
        id: {
          in: uniquePermissionIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingPermissions.length !== uniquePermissionIds.length) {
      throw new NotFoundException(
        'One or more permissions were not found. IAM refuses to guess permissions. 🛰️',
      );
    }
  }

  private async assertRoleNameIsAvailable(
    name: string,
    currentRoleId: string,
  ): Promise<void> {
    const existingRole = await this.prisma.role.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existingRole && existingRole.id !== currentRoleId) {
      throw new ConflictException(`Role "${name}" already exists.`);
    }
  }

  private mapRole(role: RoleWithPermissionsPayload): RoleWithPermissions {
    return {
      id: role.id,
      name: role.name,
      label: role.label,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map(({ permission }) => ({
        id: permission.id,
        key: permission.key,
        label: permission.label,
        description: permission.description,
      })),
    };
  }
}
