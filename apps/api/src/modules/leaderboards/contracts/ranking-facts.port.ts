/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/contracts/ranking-facts.port.ts
 *
 * 🎯 Purpose:
 * Defines allowlisted ranking facts required by Leaderboards without persistence objects.
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
  total: number;
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
export interface LeaderboardRankingFacts {
  read(
    query: Readonly<LeaderboardQuery>,
    firstRank: number,
    lastRank: number,
  ): Promise<readonly LeaderboardRankingFact[]>;
}
