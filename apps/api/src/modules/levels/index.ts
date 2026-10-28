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
export { LevelsRuntimeModule } from './levels-runtime.module';
export {
  LEVEL_EVENT_CONSUMER,
  type LevelEventConsumer,
} from './contracts/event-consumer.contract';
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
