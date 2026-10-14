/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/contracts/reputation-total-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes the current scalar sum of the owned append-only reputation ledger.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const REPUTATION_TOTAL_READER = Symbol('REPUTATION_TOTAL_READER');
export interface ReputationTotalReader {
  totalFor(recipientId: string): Promise<number>;
}
