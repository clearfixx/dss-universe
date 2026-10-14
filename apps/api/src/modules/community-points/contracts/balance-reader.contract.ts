/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/contracts/balance-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes current scalar balance without ledger mutations or ORM representation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface CommunityPointsBalanceReader {
  balance(subjectId: string): Promise<number>;
}
export const COMMUNITY_POINTS_BALANCE_READER = Symbol(
  'COMMUNITY_POINTS_BALANCE_READER',
);
