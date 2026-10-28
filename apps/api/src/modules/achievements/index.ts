/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/index.ts
 *
 * 🎯 Purpose:
 * Exposes the supported Achievements module boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { AchievementsModule } from './achievements.module';
export { AchievementsRuntimeModule } from './achievements-runtime.module';
export {
  ACHIEVEMENT_EVENT_CONSUMER,
  type AchievementEventConsumer,
} from './contracts/event-consumer.contract';
export {
  MANUAL_AWARD_TRANSACTION,
  type ManualAwardTransaction,
  type ManualAchievementAward,
} from './contracts/manual-award-transaction.port';
export {
  ACHIEVEMENT_RECIPIENT_EXISTENCE,
  type AchievementRecipientExistence,
} from './contracts/recipient-existence.port';

/**
 * Consumers import the boundary, never the achievement ledger tables.
 */
