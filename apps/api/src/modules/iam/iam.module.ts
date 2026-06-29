/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/iam.module.ts
 * Purpose: Root IAM module for roles, permissions, and user access management.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: IAM module boundary
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '@api/core/database';

import { PermissionsController, PermissionsService } from './permissions';
import { RolesController, RolesService } from './roles';
import { IamSafetyService } from './safety';
import { UserAccessController, UserAccessService } from './user-access';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController, PermissionsController, UserAccessController],
  providers: [
    RolesService,
    PermissionsService,
    UserAccessService,
    IamSafetyService,
  ],
  exports: [
    RolesService,
    PermissionsService,
    UserAccessService,
    IamSafetyService,
  ],
})
export class IamModule {}
