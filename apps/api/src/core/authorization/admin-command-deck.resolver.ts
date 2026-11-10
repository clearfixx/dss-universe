import { ForbiddenException, UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';

import { RequirePermissions } from './decorators/require-permissions.decorator';
import { Permission } from './enums/permission.registry';
import { PermissionsGuard } from './guards/permissions.guard';

/** A server-authorized capability probe, never a frontend role-name guess. */
@Resolver()
export class AdminCommandDeckResolver {
  @Query(() => Boolean)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.AdminCommandDeckAccess)
  adminCommandDeckAccess(@AuthUser() user: AuthenticatedUser): boolean {
    const roles = user.roles.map((role) => role.toLowerCase());
    if (!roles.includes('admin') && !roles.includes('owner')) {
      throw new ForbiddenException('Administrative role is required.');
    }
    return true;
  }
}
