/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/contracts/subject-eligibility.contract.ts
 *
 * 🎯 Purpose:
 * Publishes minimal current account eligibility without credentials or profile fields.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface AuthSubjectEligibility {
  isEligible(subjectId: string): Promise<boolean>;
}
export const AUTH_SUBJECT_ELIGIBILITY = Symbol('AUTH_SUBJECT_ELIGIBILITY');
