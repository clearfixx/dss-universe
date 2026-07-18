/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Permissions
 * 📄 File: permissions.service.ts
 *
 * 🎯 Purpose:
 * Coordinates permission management operations.
 *
 * 🧠 Responsibilities:
 * • creates permissions;
 * • reads permission records;
 * • updates permission metadata;
 * • deletes permissions when safe.
 *
 * 🏗️ Architecture:
 * IAM business service.
 *
 * PermissionsController
 *   ↓
 * PermissionsService
 *   ↓
 * Prisma
 *
 * ⚠️ Important:
 * Permission keys are authorization contracts.
 * Rename them carefully.
 *
 * 💡 Notes:
 * Tiny strings.
 * Big consequences. 🛰️
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
import { AuditWriterService } from '@api/core/audit';

import type { CreatePermissionDto } from './dto/create-permission.dto';
import type { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async create(dto: CreatePermissionDto, actorId?: string) {
    const existingPermission = await this.prisma.permission.findUnique({
      where: { key: dto.key },
      select: { id: true },
    });

    if (existingPermission) {
      throw new ConflictException(`Permission "${dto.key}" already exists.`);
    }

    return this.prisma.transaction(async (transaction) => {
      const permission = await transaction.permission.create({
        data: {
          key: dto.key,
          label: dto.label,
          description: dto.description,
        },
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

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" was not found.`);
    }

    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto) {
    await this.assertPermissionExists(id);

    if (dto.key) {
      await this.assertPermissionKeyIsAvailable(dto.key, id);
    }

    return this.prisma.permission.update({
      where: { id },
      data: {
        key: dto.key,
        label: dto.label,
        description: dto.description,
      },
    });
  }

  async remove(id: string) {
    const permission = await this.assertPermissionExists(id);

    await this.prisma.permission.delete({
      where: { id },
    });

    return {
      deleted: true,
      permission,
    };
  }

  private async assertPermissionExists(id: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" was not found.`);
    }

    return permission;
  }

  private async assertPermissionKeyIsAvailable(
    key: string,
    currentPermissionId: string,
  ): Promise<void> {
    const existingPermission = await this.prisma.permission.findUnique({
      where: { key },
      select: { id: true },
    });

    if (existingPermission && existingPermission.id !== currentPermissionId) {
      throw new ConflictException(`Permission "${key}" already exists.`);
    }
  }
}
