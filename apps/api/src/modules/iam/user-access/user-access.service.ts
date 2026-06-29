/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM User Access
 * 📄 File: user-access.service.ts
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
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@api/core/database';

import type { GrantUserPermissionDto } from './dto/grant-user-permission.dto';
import type { GrantUserRoleDto } from './dto/grant-user-role.dto';
import type { UserAccessSummary } from './types/user-access-summary.type';

@Injectable()
export class UserAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string): Promise<UserAccessSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        key: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            assignedAt: 'asc',
          },
        },
        directPermissions: {
          select: {
            permission: {
              select: {
                id: true,
                key: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'asc',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${userId}" was not found.`);
    }

    const rolePermissions = user.roles.flatMap(({ role }) =>
      role.permissions.map(({ permission }) => permission.key),
    );

    const directPermissionKeys = user.directPermissions.map(
      ({ permission }) => permission.key,
    );

    return {
      userId: user.id,
      roles: user.roles.map(({ role }) => ({
        id: role.id,
        name: role.name,
      })),
      directPermissions: user.directPermissions.map(({ permission }) => ({
        id: permission.id,
        name: permission.key,
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

    const existingAssignment = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId: dto.roleId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (existingAssignment) {
      throw new ConflictException('Role is already assigned to this user.');
    }

    await this.prisma.userRole.create({
      data: {
        userId,
        roleId: dto.roleId,
      },
    });

    return this.getSummary(userId);
  }

  async revokeRole(userId: string, roleId: string): Promise<UserAccessSummary> {
    await this.assertUserExists(userId);
    await this.assertRoleExists(roleId);

    const existingAssignment = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!existingAssignment) {
      throw new NotFoundException('Role assignment was not found.');
    }

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    return this.getSummary(userId);
  }

  async grantPermission(
    userId: string,
    dto: GrantUserPermissionDto,
  ): Promise<UserAccessSummary> {
    await this.assertUserExists(userId);
    await this.assertPermissionExists(dto.permissionId);

    const existingAssignment = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId: dto.permissionId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (existingAssignment) {
      throw new ConflictException(
        'Permission is already directly assigned to this user.',
      );
    }

    await this.prisma.userPermission.create({
      data: {
        userId,
        permissionId: dto.permissionId,
      },
    });

    return this.getSummary(userId);
  }

  async revokePermission(
    userId: string,
    permissionId: string,
  ): Promise<UserAccessSummary> {
    await this.assertUserExists(userId);
    await this.assertPermissionExists(permissionId);

    const existingAssignment = await this.prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!existingAssignment) {
      throw new NotFoundException(
        'Direct permission assignment was not found.',
      );
    }

    await this.prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
    });

    return this.getSummary(userId);
  }

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${userId}" was not found.`);
    }
  }

  private async assertRoleExists(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException(`Role with id "${roleId}" was not found.`);
    }
  }

  private async assertPermissionExists(permissionId: string): Promise<void> {
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
      select: { id: true },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with id "${permissionId}" was not found.`,
      );
    }
  }
}
