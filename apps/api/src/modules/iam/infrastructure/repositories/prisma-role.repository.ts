/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Roles
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-role.repository.ts
 *
 * 🎯 Purpose:
 * Persists roles and role permissions behind the private IAM contract.
 *
 * 🧠 Responsibilities:
 * • selects and maps allowlisted role and permission fields;
 * • preserves ordered reads and atomic nested role creation;
 * • applies metadata and permission assignment mutations.
 *
 * 🏗️ Architecture:
 * IAM infrastructure adapter; no ORM types cross its consumer contract.
 *
 * ⚠️ Important:
 * Safety checks remain in RolesService. Existing audit policy is unchanged.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import type {
  RoleRepository,
  RoleRecord,
} from '../../roles/contracts/role.repository.interface';
import type { RoleWithPermissions } from '../../roles/types/role-with-permissions.type';

const roleRecordSelect = {
  id: true,
  name: true,
  label: true,
  description: true,
  isSystem: true,
} satisfies Prisma.RoleSelect;
const roleWithPermissionsSelect = {
  ...roleRecordSelect,
  permissions: {
    select: {
      permission: {
        select: { id: true, key: true, label: true, description: true },
      },
    },
    orderBy: { permission: { key: 'asc' } },
  },
} satisfies Prisma.RoleSelect;
type RolePayload = Prisma.RoleGetPayload<{
  select: typeof roleWithPermissionsSelect;
}>;

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findIdByName(name: string): Promise<string | null> {
    return (
      (
        await this.prisma.role.findUnique({
          where: { name },
          select: { id: true },
        })
      )?.id ?? null
    );
  }
  findRecordById(id: string): Promise<RoleRecord | null> {
    return this.prisma.role.findUnique({
      where: { id },
      select: roleRecordSelect,
    });
  }
  async findById(id: string): Promise<RoleWithPermissions | null> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: roleWithPermissionsSelect,
    });
    return role ? this.mapRole(role) : null;
  }
  async findAll(): Promise<RoleWithPermissions[]> {
    return (
      await this.prisma.role.findMany({
        orderBy: { name: 'asc' },
        select: roleWithPermissionsSelect,
      })
    ).map((role) => this.mapRole(role));
  }
  async create(
    input: Parameters<RoleRepository['create']>[0],
  ): Promise<RoleWithPermissions> {
    return this.mapRole(
      await this.prisma.role.create({
        data: {
          name: input.name,
          label: input.label,
          description: input.description,
          permissions: input.permissionIds?.length
            ? {
                create: input.permissionIds.map((permissionId) => ({
                  permissionId,
                })),
              }
            : undefined,
        },
        select: roleWithPermissionsSelect,
      }),
    );
  }
  async update(
    id: string,
    input: Parameters<RoleRepository['update']>[1],
  ): Promise<RoleWithPermissions> {
    return this.mapRole(
      await this.prisma.role.update({
        where: { id },
        data: {
          name: input.name,
          label: input.label,
          description: input.description,
        },
        select: roleWithPermissionsSelect,
      }),
    );
  }
  async remove(id: string): Promise<void> {
    await this.prisma.role.delete({ where: { id }, select: { id: true } });
  }
  async permissionExists(id: string): Promise<boolean> {
    return (
      (await this.prisma.permission.findUnique({
        where: { id },
        select: { id: true },
      })) !== null
    );
  }
  async countPermissions(ids: readonly string[]): Promise<number> {
    return (
      await this.prisma.permission.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true },
      })
    ).length;
  }
  async hasPermission(roleId: string, permissionId: string): Promise<boolean> {
    return (
      (await this.prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId, permissionId } },
        select: { roleId: true },
      })) !== null
    );
  }
  async assignPermission(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.create({
      data: { roleId, permissionId },
      select: { roleId: true },
    });
  }
  async revokePermission(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
      select: { roleId: true },
    });
  }
  private mapRole(role: RolePayload): RoleWithPermissions {
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
