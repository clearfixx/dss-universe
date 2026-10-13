/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: apps/api/src/core/authorization/contracts/access-memberships-reader.contract.ts
 *
 * 🎯 Purpose:
 * Defines Authorization-owned evidence ports for memberships and account eligibility.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type AccessMembershipFact = Readonly<{
  key: string;
  premium: boolean;
  capabilities: readonly string[];
}>;
export interface AccessMembershipsReader {
  read(subjectId: string, at: Date): Promise<readonly AccessMembershipFact[]>;
}
export interface SubjectEligibilityReader {
  isEligible(subjectId: string): Promise<boolean>;
}
export const ACCESS_MEMBERSHIPS_READER = Symbol('ACCESS_MEMBERSHIPS_READER');
export const SUBJECT_ELIGIBILITY_READER = Symbol('SUBJECT_ELIGIBILITY_READER');
