/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Permissions
 * 📄 File: permissions.controller.ts
 *
 * 🎯 Purpose:
 * Exposes HTTP endpoints for permission management.
 *
 * 🧠 Responsibilities:
 * • receives permission management requests;
 * • protects endpoints with JWT and permission guards;
 * • delegates permission operations to PermissionsService.
 *
 * 🏗️ Architecture:
 * Thin controller.
 *
 * ⚠️ Important:
 * Do not move permission business rules into this controller.
 *
 * 💡 Notes:
 * Controller opens the door to the service.
 * It does not decide who owns the keys. 🗝️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
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

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
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
  create(
    @Body() dto: CreatePermissionDto,
    @AuthUser() actor: AuthenticatedUser,
  ) {
    return this.permissionsService.create(dto, actor.id);
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
