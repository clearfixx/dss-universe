/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: apps/api/src/core/authorization/repositories/permissions.repository.ts
 *
 * 🎯 Purpose:
 * Supplies authoritative assignment facts to existing permission workflows through owned inputs.
 *
 * 🧠 Responsibilities:
 * • delegates role-key and subject-assignment reads independently;
 * • preserves missing/empty evidence and provider failure propagation;
 * • keeps persistence and producer-owned mappings outside Authorization.
 *
 * 🏗️ Architecture:
 * Compatibility adapter for PermissionsService; root binds IAM/Auth-owned evidence.
 *
 * ⚠️ Important:
 * Facts are not decisions. Do not add a cache, ACTIVE filter or fabricated grants.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import type { UserAccessProfile } from '../types/user-access-profile.type';
import {
  AUTHORIZATION_ROLE_PERMISSION_FACTS,
  AUTHORIZATION_SUBJECT_ASSIGNMENT_FACTS,
  type AuthorizationRolePermissionFacts,
  type AuthorizationSubjectAssignmentFacts,
} from '../contracts/permission-facts-reader.port';

@Injectable()
export class PermissionsRepository {
  constructor(
    @Inject(AUTHORIZATION_ROLE_PERMISSION_FACTS)
    private readonly roleFacts: AuthorizationRolePermissionFacts,
    @Inject(AUTHORIZATION_SUBJECT_ASSIGNMENT_FACTS)
    private readonly subjectFacts: AuthorizationSubjectAssignmentFacts,
  ) {}
  findPermissionKeysByRoleNames(roleNames: string[]): Promise<string[]> {
    return this.roleFacts.read(roleNames);
  }
  findAccessProfileByUserId(userId: string): Promise<UserAccessProfile> {
    return this.subjectFacts.read(userId);
  }
}

/** Decisions belong to Authorization. Borrowed database keys do not confer ownership. */
