/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/permissions/permissions.controller.ts
 * Purpose: HTTP endpoints for permission management.
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

import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PermissionsService } from './permissions.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('iam/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @RequirePermissions(Permission.PermissionsManage)
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.PermissionsRead)
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permission.PermissionsRead)
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PermissionsManage)
  update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.PermissionsManage)
  remove(@Param('id') id: string) {
    return this.permissionsService.remove(id);
  }
}
