/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Access Group Composition
 * 📄 File: apps/api/src/composition/access-groups/access-group-integration.module.ts
 *
 * 🎯 Purpose:
 * Wires narrow ownership contracts outside Auth, IAM and Content Access.
 *
 * 🧠 Responsibilities:
 * • binds owner-specific evidence and decision ports explicitly;
 * • translates Auth, IAM, Authorization and Users contracts;
 * • keeps feature modules free of sibling infrastructure imports.
 *
 * 🏗️ Architecture:
 * Root composition only; global port bindings are not service-locator APIs.
 *
 * ⚠️ Important:
 * Export narrow tokens only; do not expose persistence or credentials.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import {
  AuthorizationModule,
  ACCESS_MEMBERSHIPS_READER,
  SUBJECT_ELIGIBILITY_READER,
} from '@api/core/authorization';
import { IamModule, GROUP_MANAGEMENT_AUTHORITY } from '@api/modules/iam';
import { AuthModule } from '@api/modules/auth';
import { CONTENT_AUDIENCE_READER } from '@api/modules/content-access';
import { PROFILE_GROUP_DISPLAY } from '@api/modules/users';
import { ProfileGroupDisplayAdapter } from './infrastructure/profile-group-display.adapter';
import { IamMembershipAdapter } from './infrastructure/iam-membership.adapter';
import { AuthEligibilityAdapter } from './infrastructure/auth-eligibility.adapter';
import { ContentAudienceAdapter } from './infrastructure/content-audience.adapter';
import { GroupManagementAdapter } from './infrastructure/group-management.adapter';
@Global()
@Module({
  imports: [IamModule, AuthModule, AuthorizationModule],
  providers: [
    { provide: PROFILE_GROUP_DISPLAY, useClass: ProfileGroupDisplayAdapter },
    { provide: ACCESS_MEMBERSHIPS_READER, useClass: IamMembershipAdapter },
    { provide: SUBJECT_ELIGIBILITY_READER, useClass: AuthEligibilityAdapter },
    { provide: CONTENT_AUDIENCE_READER, useClass: ContentAudienceAdapter },
    { provide: GROUP_MANAGEMENT_AUTHORITY, useClass: GroupManagementAdapter },
  ],
  exports: [
    ACCESS_MEMBERSHIPS_READER,
    SUBJECT_ELIGIBILITY_READER,
    CONTENT_AUDIENCE_READER,
    GROUP_MANAGEMENT_AUTHORITY,
    PROFILE_GROUP_DISPLAY,
  ],
})
export class AccessGroupIntegrationModule {}
