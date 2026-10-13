/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/contracts/block-decision.contract.ts
 *
 * 🎯 Purpose:
 * Publishes only the current bidirectional block fact, never block lists or profile rows.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface UserBlockDecisionReader {
  isBlocked(firstSubjectId: string, secondSubjectId: string): Promise<boolean>;
}
export const USER_BLOCK_DECISIONS = Symbol('USER_BLOCK_DECISIONS');
