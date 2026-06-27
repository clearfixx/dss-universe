import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@api/core/auth';

import { RequirePermissions } from './decorators/require-permissions.decorator';
import { Permission } from './enums/permission.registry';
import { PermissionsGuard } from './guards/permissions.guard';

@Controller('authz-test')
export class AuthorizationTestController {
  @Get('public')
  publicRoute() {
    return {
      message: 'Authorization public route works',
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.UsersRead)
  @Get('users-read')
  usersReadRoute() {
    return {
      message: 'You have users.read permission',
    };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.UsersDelete)
  @Get('users-delete')
  usersDeleteRoute() {
    return {
      message: 'You have users.delete permission',
    };
  }
}
