/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Permissions
 * 📄 File: apps/api/src/modules/iam/permissions/permissions.service.ts
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
 * PermissionRepository
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
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  IAM_PERMISSION_REPOSITORY,
  type PermissionRepository,
} from './contracts/permission.repository.interface';
import type { PermissionRecord } from './types/permission-record.type';

import type { CreatePermissionDto } from './dto/create-permission.dto';
import type { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(IAM_PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepository,
  ) {}

  async create(
    dto: CreatePermissionDto,
    actorId?: string,
  ): Promise<PermissionRecord> {
    const existingPermission = await this.permissions.findIdByKey(dto.key);

    if (existingPermission) {
      throw new ConflictException(`Permission "${dto.key}" already exists.`);
    }

    return this.permissions.createWithAudit(
      {
        key: dto.key,
        label: dto.label,
        description: dto.description,
      },
      actorId,
    );
  }

  findAll(): Promise<PermissionRecord[]> {
    return this.permissions.findAll();
  }

  async findOne(id: string): Promise<PermissionRecord> {
    const permission = await this.permissions.findById(id);

    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" was not found.`);
    }

    return permission;
  }

  async update(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionRecord> {
    await this.assertPermissionExists(id);

    if (dto.key) {
      await this.assertPermissionKeyIsAvailable(dto.key, id);
    }

    return this.permissions.update(id, {
      key: dto.key,
      label: dto.label,
      description: dto.description,
    });
  }

  async remove(id: string) {
    const permission = await this.assertPermissionExists(id);

    await this.permissions.remove(id);

    return {
      deleted: true,
      permission,
    };
  }

  private async assertPermissionExists(id: string) {
    return this.findOne(id);
  }

  private async assertPermissionKeyIsAvailable(
    key: string,
    currentPermissionId: string,
  ): Promise<void> {
    const existingPermissionId = await this.permissions.findIdByKey(key);

    if (existingPermissionId && existingPermissionId !== currentPermissionId) {
      throw new ConflictException(`Permission "${key}" already exists.`);
    }
  }
}
