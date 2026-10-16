/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/contracts/role-revocation-transaction.port.ts
 *
 * 🎯 Purpose:
 * Defines atomic role removal with the existing IAM-owned synchronous safety check.
 *
 * ⚠️ Important:
 * The check receives only IAM policy facts, never a transaction or Auth/profile data.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type RoleRevocationResult =
  | 'subject-not-found'
  | 'role-not-found'
  | 'assignment-not-found'
  | 'revoked';
export type RoleRevocationCheck = (
  state: Readonly<{ roleName: string; adminsWithRoleCount: number }>,
) => undefined;
export interface RoleRevocationTransaction {
  revoke(
    subjectId: string,
    roleId: string,
    assertCanRevoke: RoleRevocationCheck,
  ): Promise<RoleRevocationResult>;
}
export const ROLE_REVOCATION_TRANSACTION = Symbol(
  'ROLE_REVOCATION_TRANSACTION',
);
