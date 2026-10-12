/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Roles
 * 📄 File: apps/api/src/modules/iam/roles/roles.service.ts
 *
 * 🎯 Purpose:
 * Coordinates role management and protects role-related business rules.
 *
 * 🧠 Responsibilities:
 * • checks role names and permission existence;
 * • protects system roles through IAM safety checks;
 * • delegates persistence through the private role repository.
 *
 * 🏗️ Architecture:
 * IAM application service. No ORM types, selectors or transaction clients.
 *
 * ⚠️ Important:
 * Preserve existing mutation rules; roles are permission containers.
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
import type { CreateRoleDto } from './dto/create-role.dto';
import type { AssignRoleDto } from './dto/assign-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { IamSafetyService } from '../safety';
import type { RoleWithPermissions } from './types/role-with-permissions.type';
import {
  IAM_ROLE_REPOSITORY,
  type RoleRepository,
} from './contracts/role.repository.interface';

@Injectable()
export class RolesService {
  constructor(
    @Inject(IAM_ROLE_REPOSITORY) private readonly roles: RoleRepository,
    private readonly iamSafetyService: IamSafetyService,
  ) {}

  async create(dto: CreateRoleDto): Promise<RoleWithPermissions> {
    if (await this.roles.findIdByName(dto.name)) {
      throw new ConflictException(`Role "${dto.name}" already exists.`);
    }
    if (dto.permissionIds?.length) {
      const ids = [...new Set(dto.permissionIds)];
      if ((await this.roles.countPermissions(ids)) !== ids.length) {
        throw new NotFoundException(
          'One or more permissions were not found. IAM refuses to guess permissions. 🛰️',
        );
      }
    }
    return this.roles.create({
      name: dto.name,
      label: dto.label,
      description: dto.description,
      permissionIds: dto.permissionIds,
    });
  }

  findAll(): Promise<RoleWithPermissions[]> {
    return this.roles.findAll();
  }

  async findOne(id: string): Promise<RoleWithPermissions> {
    const role = await this.roles.findById(id);
    if (!role)
      throw new NotFoundException(`Role with id "${id}" was not found.`);
    return role;
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
      const existingId = await this.roles.findIdByName(dto.name);
      if (existingId && existingId !== id)
        throw new ConflictException(`Role "${dto.name}" already exists.`);
    }
    return this.roles.update(id, {
      name: dto.name,
      label: dto.label,
      description: dto.description,
    });
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
    await this.roles.remove(id);
    return { deleted: true, role };
  }

  async assignPermission(
    roleId: string,
    dto: AssignRoleDto,
  ): Promise<RoleWithPermissions> {
    await this.assertRoleExists(roleId);
    await this.assertPermissionExists(dto.permissionId);
    if (await this.roles.hasPermission(roleId, dto.permissionId)) {
      throw new ConflictException(
        'Permission is already assigned to this role.',
      );
    }
    await this.roles.assignPermission(roleId, dto.permissionId);
    return this.findOne(roleId);
  }

  async revokePermission(
    roleId: string,
    permissionId: string,
  ): Promise<RoleWithPermissions> {
    await this.assertRoleExists(roleId);
    await this.assertPermissionExists(permissionId);
    if (!(await this.roles.hasPermission(roleId, permissionId))) {
      throw new NotFoundException(
        'Permission assignment was not found for this role.',
      );
    }
    await this.roles.revokePermission(roleId, permissionId);
    return this.findOne(roleId);
  }

  private async assertRoleExists(id: string) {
    const role = await this.roles.findRecordById(id);
    if (!role)
      throw new NotFoundException(`Role with id "${id}" was not found.`);
    return role;
  }

  private async assertPermissionExists(id: string): Promise<void> {
    if (!(await this.roles.permissionExists(id))) {
      throw new NotFoundException(`Permission with id "${id}" was not found.`);
    }
  }
}
