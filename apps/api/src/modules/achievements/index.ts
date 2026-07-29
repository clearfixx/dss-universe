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
export { AchievementsService } from './application/services/achievements.service';
export type {
  AchievementAward,
  AchievementConsumption,
  AchievementDefinition,
  AchievementRule,
} from './domain/types/achievements.type';

/**
 * Consumers import the boundary, never the achievement ledger tables.
 */
