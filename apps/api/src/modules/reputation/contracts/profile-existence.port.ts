/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/contracts/profile-existence.port.ts
 *
 * 🎯 Purpose:
 * Defines existence needed for history lookup independently of eligibility.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface ReputationProfileExistence {
  exists(subjectId: string): Promise<boolean>;
}
export const REPUTATION_PROFILE_EXISTENCE = Symbol(
  'REPUTATION_PROFILE_EXISTENCE',
);
