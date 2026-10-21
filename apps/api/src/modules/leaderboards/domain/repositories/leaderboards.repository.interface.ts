/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/domain/repositories/leaderboards.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines the read-only persistence boundary for community leaderboards.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  LeaderboardPage,
  LeaderboardQuery,
} from '../types/leaderboards.type';

export const LEADERBOARDS_REPOSITORY = Symbol('LEADERBOARDS_REPOSITORY');

export interface LeaderboardsRepository {
  page(query: LeaderboardQuery): Promise<LeaderboardPage>;
}

/**
 * No award method belongs here. The Community Points ledger owns every point.
 */
