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
import type {
  RoleRevocationCheck,
  RoleRevocationResult,
} from '../../contracts/role-revocation-transaction.port';
export type { RoleRevocationResult } from '../../contracts/role-revocation-transaction.port';
export interface RoleRevocationRepository {
  revoke(
    subjectId: string,
    roleId: string,
    assertCanRevoke: RoleRevocationCheck,
  ): Promise<RoleRevocationResult>;
}
export const IAM_ROLE_REVOCATION_REPOSITORY = Symbol(
  'IAM_ROLE_REVOCATION_REPOSITORY',
);
