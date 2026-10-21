/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/contracts/ranking-facts.port.ts
 *
 * 🎯 Purpose:
 * Defines allowlisted ranking rows and independent population totals from one read.
 *
 * ⚠️ Important:
 * No credentials, account state, ORM rows or all-time ledger balance cross this port.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { LeaderboardQuery } from '../domain/types/leaderboards.type';

export const LEADERBOARD_RANKING_FACTS = Symbol('LEADERBOARD_RANKING_FACTS');
export type LeaderboardRankingFact = Readonly<{
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  communityPoints: number;
  reputation: number;
  currentLevel: number | null;
  titleName: string | null;
  titleColor: string | null;
  titleBadge: string | null;
}>;
export type LeaderboardRankingResult = Readonly<{
  total: number;
  rows: readonly LeaderboardRankingFact[];
}>;
export interface LeaderboardRankingFacts {
  read(
    query: Readonly<LeaderboardQuery>,
    firstRank: number,
    lastRank: number,
  ): Promise<LeaderboardRankingResult>;
}
