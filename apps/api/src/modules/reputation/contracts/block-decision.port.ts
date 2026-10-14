/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/contracts/block-decision.port.ts
 *
 * 🎯 Purpose:
 * Defines the pairwise safety decision required by Reputation without Users knowledge.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface ReputationBlockReader {
  isBlocked(firstSubjectId: string, secondSubjectId: string): Promise<boolean>;
}
export const REPUTATION_BLOCK_READER = Symbol('REPUTATION_BLOCK_READER');
