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
import {
  IAM_ACCESS_GROUP_REPOSITORY,
  type AccessGroupRepository,
} from './access-groups/contracts/access-group.repository.interface';
import { IAM_ACCESS_MEMBERSHIPS } from './access-groups/contracts/effective-memberships.contract';
import { IAM_PUBLIC_GROUP_DISPLAY } from './access-groups/contracts/public-group-display.contract';
import { PrismaAccessGroupRepository } from './infrastructure/repositories/prisma-access-group.repository';
import { AccessGroupsController } from './access-groups/presentation/access-groups.controller';
import { AccessGroupsService } from './access-groups/application/access-groups.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    RolesController,
    PermissionsController,
    UserAccessController,
    AccessGroupsController,
  ],
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
    {
      provide: IAM_PUBLIC_GROUP_DISPLAY,
      inject: [IAM_ACCESS_GROUP_REPOSITORY],
      useFactory: (repository: AccessGroupRepository) =>
        Object.freeze({
          readPublic: (subjectId: string, at: Date) =>
            repository.publicGroups(subjectId, at),
        }),
    },
    AccessGroupsService,
    {
      provide: IAM_ACCESS_GROUP_REPOSITORY,
      useClass: PrismaAccessGroupRepository,
    },
    {
      provide: IAM_ACCESS_MEMBERSHIPS,
      inject: [IAM_ACCESS_GROUP_REPOSITORY],
      useFactory: (repository: AccessGroupRepository) =>
        Object.freeze({
          readEffective: (subjectId: string, at: Date) =>
            repository.effectiveMemberships(subjectId, at),
        }),
    },
  ],
  exports: [IAM_ACCESS_MEMBERSHIPS, IAM_PUBLIC_GROUP_DISPLAY],
})
export class IamModule {}
