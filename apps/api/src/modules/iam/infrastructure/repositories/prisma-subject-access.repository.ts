/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-subject-access.repository.ts
 *
 * 🎯 Purpose:
 * Persists IAM assignments without exposing profile data or ORM relation shapes.
 *
 * 🧠 Responsibilities:
 * • reads allowlisted ordered assignment facts;
 * • checks opaque subject, role and permission existence;
 * • applies ordinary role grants and direct permission mutations.
 *
 * 🏗️ Architecture:
 * Private IAM infrastructure adapter implementing the owned assignment port.
 *
 * ⚠️ Important:
 * No role revocation here: its dedicated locked capability owns final-holder safety.
 * Existing separate check/write/read sequencing and audit policy are preserved.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { SubjectAccessRepository } from '../../user-access/contracts/subject-access.repository.interface';
import type { SubjectAccessAssignments } from '../../user-access/types/subject-access-assignments.type';

@Injectable()
export class PrismaSubjectAccessRepository implements SubjectAccessRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findAssignments(
    userId: string,
  ): Promise<SubjectAccessAssignments | null> {
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
    if (!user) return null;
    return {
      subjectId: user.id,
      roles: user.roles.map(({ role }) => ({
        id: role.id,
        name: role.name,
        permissionKeys: role.permissions.map(
          ({ permission }) => permission.key,
        ),
      })),
      directPermissions: user.directPermissions.map(({ permission }) => ({
        id: permission.id,
        key: permission.key,
      })),
    };
  }
  async subjectExists(id: string): Promise<boolean> {
    return (
      (await this.prisma.user.findUnique({
        where: { id },
        select: { id: true },
      })) !== null
    );
  }
  async roleExists(id: string): Promise<boolean> {
    return (
      (await this.prisma.role.findUnique({
        where: { id },
        select: { id: true },
      })) !== null
    );
  }
  async permissionExists(id: string): Promise<boolean> {
    return (
      (await this.prisma.permission.findUnique({
        where: { id },
        select: { id: true },
      })) !== null
    );
  }
  async hasRole(userId: string, roleId: string): Promise<boolean> {
    return (
      (await this.prisma.userRole.findUnique({
        where: { userId_roleId: { userId, roleId } },
        select: { userId: true },
      })) !== null
    );
  }
  async grantRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.create({
      data: { userId, roleId },
      select: { userId: true },
    });
  }
  async hasDirectPermission(
    userId: string,
    permissionId: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.userPermission.findUnique({
        where: { userId_permissionId: { userId, permissionId } },
        select: { userId: true },
      })) !== null
    );
  }
  async grantPermission(userId: string, permissionId: string): Promise<void> {
    await this.prisma.userPermission.create({
      data: { userId, permissionId },
      select: { userId: true },
    });
  }
  async revokePermission(userId: string, permissionId: string): Promise<void> {
    await this.prisma.userPermission.delete({
      where: { userId_permissionId: { userId, permissionId } },
      select: { userId: true },
    });
  }
}
