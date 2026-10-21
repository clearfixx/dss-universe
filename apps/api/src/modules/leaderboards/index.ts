/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/index.ts
 *
 * 🎯 Purpose:
 * Exposes named ranking inputs and projections without the private query service.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { LeaderboardsModule } from './leaderboards.module';
export {
  LEADERBOARD_RANKING_FACTS,
  type LeaderboardRankingFacts,
  type LeaderboardRankingFact,
  type LeaderboardRankingResult,
} from './contracts/ranking-facts.port';
export type { LeaderboardQuery } from './domain/types/leaderboards.type';
export type {
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardPeriod,
} from './domain/types/leaderboards.type';

/**
 * Keep exports deliberate; a leaderboard should not leak its SQL starting grid.
 */
