/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/contracts/profile-existence.contract.ts
 *
 * 🎯 Purpose:
 * Publishes profile existence only, without credentials, eligibility or profile rows.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface ProfileExistenceReader {
  exists(subjectId: string): Promise<boolean>;
}
export const PROFILE_EXISTENCE_READER = Symbol('PROFILE_EXISTENCE_READER');
