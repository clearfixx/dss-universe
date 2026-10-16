/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization Read Composition
 * 📄 File: apps/api/src/composition/authorization-reads/authorization-read-composition.module.ts
 *
 * 🎯 Purpose:
 * Wires authoritative assignment evidence without feature-to-feature imports.
 *
 * 🏗️ Architecture:
 * Owned fact boundary; root infrastructure assembles cross-owner persistence.
 *
 * ⚠️ Important:
 * Preserve current query schedule and first-seen order; no ACTIVE policy, cache or fallback on failure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@api/core/database';
import { AuthorizationModule } from '@api/core/authorization';
import { IamModule } from '@api/modules/iam';
import {
  AUTHORIZATION_ROLE_PERMISSION_FACTS,
  AUTHORIZATION_SUBJECT_ASSIGNMENT_FACTS,
} from '@api/core/authorization';
import { PrismaAuthorizationSubjectReader } from './infrastructure/prisma-authorization-subject.reader';
import { IamRolePermissionFactsAdapter } from './infrastructure/iam-role-permission-facts.adapter';
@Global()
@Module({
  imports: [PrismaModule, AuthorizationModule, IamModule],
  providers: [
    {
      provide: AUTHORIZATION_ROLE_PERMISSION_FACTS,
      useClass: IamRolePermissionFactsAdapter,
    },
    {
      provide: AUTHORIZATION_SUBJECT_ASSIGNMENT_FACTS,
      useClass: PrismaAuthorizationSubjectReader,
    },
  ],
  exports: [
    AUTHORIZATION_ROLE_PERMISSION_FACTS,
    AUTHORIZATION_SUBJECT_ASSIGNMENT_FACTS,
  ],
})
export class AuthorizationReadCompositionModule {}
