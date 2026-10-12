/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM
 * 📄 File: apps/api/src/modules/iam/iam.module.ts
 *
 * 🎯 Purpose:
 * Assembles role, permission, and user access management features.
 *
 * 🧠 Responsibilities:
 * • registers IAM controllers;
 * • registers IAM services;
 * • binds owned persistence contracts to IAM infrastructure adapters;
 * • defines the IAM module boundary.
 *
 * 🏗️ Architecture:
 * Feature module for Identity and Access Management.
 *
 * ⚠️ Important:
 * IAM manages access data.
 * Authentication still owns login, identity, and tokens.
 *
 * 💡 Notes:
 * IAM supplies permission management in Command Deck.
 * Handle the big red buttons carefully. 🚨
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { PrismaModule } from '@api/core/database';

import { PermissionsController, PermissionsService } from './permissions';
import { RolesController, RolesService } from './roles';
import { IamSafetyService } from './safety';
import { UserAccessController, UserAccessService } from './user-access';
import { IAM_PERMISSION_REPOSITORY } from './permissions/contracts/permission.repository.interface';
import { PrismaPermissionRepository } from './infrastructure/repositories/prisma-permission.repository';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController, PermissionsController, UserAccessController],
  providers: [
    RolesService,
    PermissionsService,
    {
      provide: IAM_PERMISSION_REPOSITORY,
      useClass: PrismaPermissionRepository,
    },
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
