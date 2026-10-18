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
export {
  LEADERBOARD_RANKING_FACTS,
  type LeaderboardRankingFacts,
  type LeaderboardRankingFact,
} from './contracts/ranking-facts.port';
export type { LeaderboardQuery } from './domain/types/leaderboards.type';
export { LeaderboardsService } from './application/services/leaderboards.service';
export type {
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardPeriod,
} from './domain/types/leaderboards.type';

/**
 * Keep exports deliberate; a leaderboard should not leak its SQL starting grid.
 */
