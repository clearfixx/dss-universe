/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/contracts/points-balance.port.ts
 *
 * 🎯 Purpose:
 * Defines the authoritative balance needed to derive level progress.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface LevelPointsBalanceReader {
  balance(subjectId: string): Promise<number>;
}
export const LEVEL_POINTS_BALANCE_READER = Symbol(
  'LEVEL_POINTS_BALANCE_READER',
);
