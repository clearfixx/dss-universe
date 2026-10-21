/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/index.ts
 *
 * 🎯 Purpose:
 * Exposes the public Levels module boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { LevelsModule } from './levels.module';
export {
  LEVEL_RECIPIENT_EXISTENCE,
  type LevelRecipientExistence,
} from './contracts/recipient-existence.port';
export {
  LEVEL_POINTS_BALANCE_READER,
  type LevelPointsBalanceReader,
} from './contracts/points-balance.port';

/**
 * Keep the public airlock smaller than the level ladder.
 */
