import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';

import { JwtAuthGuard } from '@api/core/auth';

import { RequirePermissions } from './decorators/require-permissions.decorator';
import { Permission } from './enums/permission.registry';
import { PermissionsGuard } from './guards/permissions.guard';

/** A server-authorized capability probe, never a frontend role-name guess. */
@Resolver()
export class AdminCommandDeckResolver {
  @Query(() => Boolean)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.AdminCommandDeckAccess)
  adminCommandDeckAccess(): boolean {
    return true;
  }
}
