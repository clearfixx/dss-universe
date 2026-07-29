/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/domain/types/leaderboards.type.ts
 *
 * 🎯 Purpose:
 * Defines deterministic Community Points leaderboard read projections.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type LeaderboardPeriod = 'MONTH' | 'YEAR' | 'ALL_TIME';

export type LeaderboardWindow = {
  period: LeaderboardPeriod;
  startsAt: Date | null;
  endsAt: Date;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  communityPoints: number;
  currentLevel: number;
  reputation: number;
  selectedTitle: {
    name: string;
    color: string;
    badge: string;
  } | null;
};

export type LeaderboardPage = LeaderboardWindow & {
  items: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  viewerRank: number | null;
  viewerCommunityPoints: number | null;
  generatedAt: Date;
};

export type LeaderboardQuery = LeaderboardWindow & {
  viewerId: string;
  page: number;
  limit: number;
};

/**
 * A rank is a view of the ledger, not a new source of points.
 */
