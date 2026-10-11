/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/contracts/profile-display-reader.contract.ts
 *
 * 🎯 Purpose:
 * Exposes only the display identifier needed for legacy token presentation.
 *
 * ⚠️ Important:
 * This is not an account-eligibility or credential authority.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface ProfileDisplayReader {
  findUsername(subjectId: string): Promise<string | null>;
}

export const PROFILE_DISPLAY_READER = Symbol('PROFILE_DISPLAY_READER');
