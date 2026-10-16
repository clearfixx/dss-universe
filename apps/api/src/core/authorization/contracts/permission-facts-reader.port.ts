/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: apps/api/src/core/authorization/contracts/permission-facts-reader.port.ts
 *
 * 🎯 Purpose:
 * Defines separate assignment-fact inputs for Authorization without granting persistence ownership.
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
import type { UserAccessProfile } from '../types/user-access-profile.type';
export const AUTHORIZATION_ROLE_PERMISSION_FACTS = Symbol(
  'AUTHORIZATION_ROLE_PERMISSION_FACTS',
);
export const AUTHORIZATION_SUBJECT_ASSIGNMENT_FACTS = Symbol(
  'AUTHORIZATION_SUBJECT_ASSIGNMENT_FACTS',
);
export interface AuthorizationRolePermissionFacts {
  read(roleNames: string[]): Promise<string[]>;
}
export interface AuthorizationSubjectAssignmentFacts {
  read(subjectId: string): Promise<UserAccessProfile>;
}
