/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM User Access
 * 📄 File: user-access.controller.ts
 *
 * 🎯 Purpose:
 * Exposes HTTP endpoints for user access management.
 *
 * 🧠 Responsibilities:
 * • returns user access summaries;
 * • grants and revokes user roles;
 * • grants and revokes direct user permissions;
 * • protects endpoints with JWT and permission guards.
 *
 * 🏗️ Architecture:
 * Thin controller.
 *
 * Request
 *   ↓
 * JwtAuthGuard
 *   ↓
 * PermissionsGuard
 *   ↓
 * UserAccessService
 *
 * ⚠️ Important:
 * Do not move access business rules into this controller.
 *
 * 💡 Notes:
 * Controller checks tickets.
 * Service updates the manifest. 🛰️
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
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';

import { GrantUserPermissionDto } from './dto/grant-user-permission.dto';
import { GrantUserRoleDto } from './dto/grant-user-role.dto';
import { UserAccessService } from './user-access.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('iam/user-access')
export class UserAccessController {
  constructor(private readonly userAccessService: UserAccessService) {}

  @Get(':userId')
  @RequirePermissions(Permission.UsersRead)
  getSummary(@Param('userId') userId: string) {
    return this.userAccessService.getSummary(userId);
  }

  @Post(':userId/roles')
  @RequirePermissions(Permission.RolesUpdate)
  grantRole(@Param('userId') userId: string, @Body() dto: GrantUserRoleDto) {
    return this.userAccessService.grantRole(userId, dto);
  }

  @Delete(':userId/roles/:roleId')
  @RequirePermissions(Permission.RolesUpdate)
  revokeRole(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.userAccessService.revokeRole(userId, roleId);
  }

  @Post(':userId/permissions')
  @RequirePermissions(Permission.PermissionsManage)
  grantPermission(
    @Param('userId') userId: string,
    @Body() dto: GrantUserPermissionDto,
  ) {
    return this.userAccessService.grantPermission(userId, dto);
  }

  @Delete(':userId/permissions/:permissionId')
  @RequirePermissions(Permission.PermissionsManage)
  revokePermission(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.userAccessService.revokePermission(userId, permissionId);
  }
}
