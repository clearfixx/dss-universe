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
  /** Batch variant for lists (forum author cards); missing IDs mean zero. */
  totalsFor(
    recipientIds: readonly string[],
  ): Promise<ReadonlyMap<string, number>>;
  /** Net reputation received in [since, until) (community missions). */
  earnedBetween(recipientId: string, since: Date, until: Date): Promise<number>;
}
