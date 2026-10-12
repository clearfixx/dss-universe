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
import { IAM_ROLE_REPOSITORY } from './roles/contracts/role.repository.interface';
import { PrismaRoleRepository } from './infrastructure/repositories/prisma-role.repository';
import { IAM_ROLE_REVOCATION_REPOSITORY } from './user-access/contracts/role-revocation.repository.interface';
import { PrismaRoleRevocationRepository } from './infrastructure/repositories/prisma-role-revocation.repository';
import { IAM_SUBJECT_ACCESS_REPOSITORY } from './user-access/contracts/subject-access.repository.interface';
import { PrismaSubjectAccessRepository } from './infrastructure/repositories/prisma-subject-access.repository';

@Module({
  imports: [PrismaModule],
  controllers: [RolesController, PermissionsController, UserAccessController],
  providers: [
    RolesService,
    { provide: IAM_ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    PermissionsService,
    {
      provide: IAM_PERMISSION_REPOSITORY,
      useClass: PrismaPermissionRepository,
    },
    UserAccessService,
    {
      provide: IAM_SUBJECT_ACCESS_REPOSITORY,
      useClass: PrismaSubjectAccessRepository,
    },
    {
      provide: IAM_ROLE_REVOCATION_REPOSITORY,
      useClass: PrismaRoleRevocationRepository,
    },
    IamSafetyService,
  ],
})
export class IamModule {}
