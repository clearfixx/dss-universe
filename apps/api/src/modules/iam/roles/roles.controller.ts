/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/roles/roles.controller.ts
 * Purpose: HTTP endpoints for role management.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: Thin controller
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';

import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('iam/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions(Permission.RolesCreate)
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.RolesRead)
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.RolesRead)
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.RolesUpdate)
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.RolesDelete)
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  @Post(':id/permissions')
  @RequirePermissions(Permission.PermissionsManage)
  assignPermission(@Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.rolesService.assignPermission(id, dto);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions(Permission.PermissionsManage)
  revokePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.rolesService.revokePermission(id, permissionId);
  }
}
