/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/contracts/account-evidence.port.ts
 *
 * 🎯 Purpose:
 * Defines minimal account facts needed for existing age and active-participant policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ReputationAccountEvidence = Readonly<{
  active: boolean;
  createdAt: Date;
}>;
export interface ReputationAccountReader {
  find(subjectId: string): Promise<ReputationAccountEvidence | null>;
}
export const REPUTATION_ACCOUNT_READER = Symbol('REPUTATION_ACCOUNT_READER');
