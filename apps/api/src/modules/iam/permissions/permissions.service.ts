/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/permissions/permissions.service.ts
 * Purpose: Business logic for permission management.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: IAM service
 *
 * Notes:
 * - Permissions are tiny strings with scary power.
 * - Treat them like keys to the station airlock. 🛰️
 */

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../../core/database';

import type { CreatePermissionDto } from './dto/create-permission.dto';
import type { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePermissionDto) {
    const existingPermission = await this.prisma.permission.findUnique({
      where: { key: dto.key },
      select: { id: true },
    });

    if (existingPermission) {
      throw new ConflictException(`Permission "${dto.key}" already exists.`);
    }

    return this.prisma.permission.create({
      data: {
        key: dto.key,
        label: dto.label,
        description: dto.description,
      },
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
