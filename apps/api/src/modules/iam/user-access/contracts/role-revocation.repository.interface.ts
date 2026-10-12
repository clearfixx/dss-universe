/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/user-access/contracts/role-revocation.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines atomic role revocation with an application-owned synchronous safety policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type RoleRevocationResult =
  | 'subject-not-found'
  | 'role-not-found'
  | 'assignment-not-found'
  | 'revoked';
export interface RoleRevocationRepository {
  revoke(
    subjectId: string,
    roleId: string,
    assertCanRevoke: (
      state: Readonly<{ roleName: string; adminsWithRoleCount: number }>,
    ) => undefined,
  ): Promise<RoleRevocationResult>;
}
export const IAM_ROLE_REVOCATION_REPOSITORY = Symbol(
  'IAM_ROLE_REVOCATION_REPOSITORY',
);
