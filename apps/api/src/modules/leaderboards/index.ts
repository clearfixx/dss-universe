/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/index.ts
 *
 * 🎯 Purpose:
 * Exposes the public Leaderboards module boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { LeaderboardsModule } from './leaderboards.module';
export { LeaderboardsService } from './application/services/leaderboards.service';
export type {
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardPeriod,
} from './domain/types/leaderboards.type';

/**
 * Keep exports deliberate; a leaderboard should not leak its SQL starting grid.
 */
