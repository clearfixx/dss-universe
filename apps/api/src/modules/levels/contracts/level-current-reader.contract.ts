/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/contracts/level-current-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes members' current level (the target of their latest transition)
 * for public cards such as forum post authors.
 *
 * ⚠️ Important:
 * Batch only; members without transitions are level 0 and simply absent
 * from the map. No balances or history cross this contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const LEVEL_CURRENT_READER = Symbol('LEVEL_CURRENT_READER');

export interface LevelCurrentReader {
  levelsFor(userIds: readonly string[]): Promise<ReadonlyMap<string, number>>;
}
