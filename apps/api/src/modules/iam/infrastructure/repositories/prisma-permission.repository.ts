/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Permissions
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-permission.repository.ts
 *
 * 🎯 Purpose:
 * Persists IAM permissions behind its owned repository contract.
 *
 * 🧠 Responsibilities:
 * • reads explicit permission fields and ordered permission lists;
 * • commits creation and audit together;
 * • applies allowlisted permission metadata changes.
 *
 * 🏗️ Architecture:
 * Private IAM infrastructure adapter; no ORM client crosses the contract.
 *
 * ⚠️ Important:
 * Audit failure rolls creation back. Existing update/delete audit policy is preserved.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import type { PermissionRepository } from '../../permissions/contracts/permission.repository.interface';
import type { PermissionRecord } from '../../permissions/types/permission-record.type';

const permissionSelect = {
  id: true,
  key: true,
  label: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PermissionSelect;

@Injectable()
export class PrismaPermissionRepository implements PermissionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async findIdByKey(key: string): Promise<string | null> {
    return (
      (
        await this.prisma.permission.findUnique({
          where: { key },
          select: { id: true },
        })
      )?.id ?? null
    );
  }

  findAll(): Promise<PermissionRecord[]> {
    return this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
      select: permissionSelect,
    });
  }

  findById(id: string): Promise<PermissionRecord | null> {
    return this.prisma.permission.findUnique({
      where: { id },
      select: permissionSelect,
    });
  }

  createWithAudit(
    input: Readonly<{ key: string; label: string; description?: string }>,
    actorId?: string,
  ): Promise<PermissionRecord> {
    return this.prisma.transaction(async (transaction) => {
      const permission = await transaction.permission.create({
        data: {
          key: input.key,
          label: input.label,
          description: input.description,
        },
        select: permissionSelect,
      });
      await this.audit.append(transaction, {
        action: 'iam.permission.created',
        actorType: actorId ? 'USER' : 'SYSTEM',
        actorId,
        targetType: 'Permission',
        targetId: permission.id,
        metadata: { key: permission.key, label: permission.label },
      });
      return permission;
    });
  }

  update(
    id: string,
    input: Readonly<{ key?: string; label?: string; description?: string }>,
  ): Promise<PermissionRecord> {
    return this.prisma.permission.update({
      where: { id },
      data: {
        key: input.key,
        label: input.label,
        description: input.description,
      },
      select: permissionSelect,
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.permission.delete({
      where: { id },
      select: { id: true },
    });
  }
}
