/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM
 * 📄 File: iam.module.ts
 *
 * 🎯 Purpose:
 * Assembles role, permission, and user access management features.
 *
 * 🧠 Responsibilities:
 * • registers IAM controllers;
 * • registers IAM services;
 * • provides Prisma access for IAM workflows;
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
 * IAM is Mission Control for permissions.
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
