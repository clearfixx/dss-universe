/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/infrastructure/repositories/ranking-facts-leaderboards.repository.ts
 *
 * 🎯 Purpose:
 * Interprets ranking facts as leaderboard pages without reading foreign persistence.
 *
 * 🧠 Responsibilities:
 * • selects requested ranks and the viewer from one facts result;
 * • maps public cards with the existing level and title fallbacks.
 *
 * 🏗️ Architecture:
 * Leaderboards repository adapter; foreign persistence stays behind a semantic port.
 *
 * ⚠️ Important:
 * Population totals are independent of returned rows; never infer them from an empty page.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  LEADERBOARD_RANKING_FACTS,
  type LeaderboardRankingFacts,
  type LeaderboardRankingFact,
} from '../../contracts/ranking-facts.port';
import type { LeaderboardsRepository } from '../../domain/repositories/leaderboards.repository.interface';
import type {
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardQuery,
} from '../../domain/types/leaderboards.type';

@Injectable()
export class RankingFactsLeaderboardsRepository implements LeaderboardsRepository {
  constructor(
    @Inject(LEADERBOARD_RANKING_FACTS)
    private readonly facts: LeaderboardRankingFacts,
  ) {}
  async page(query: LeaderboardQuery): Promise<LeaderboardPage> {
    const firstRank = (query.page - 1) * query.limit + 1;
    const lastRank = firstRank + query.limit - 1;
    const { rows, total } = await this.facts.read(query, firstRank, lastRank);
    const pageRows = rows.filter(
      (row) => row.rank >= firstRank && row.rank <= lastRank,
    );
    const viewer = rows.find((row) => row.userId === query.viewerId);
    return {
      period: query.period,
      startsAt: query.startsAt,
      endsAt: query.endsAt,
      generatedAt: query.endsAt,
      items: pageRows.map((row) => this.toEntry(row)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
      viewerRank: viewer ? viewer.rank : null,
      viewerCommunityPoints: viewer ? viewer.communityPoints : null,
    };
  }
  private toEntry(row: LeaderboardRankingFact): LeaderboardEntry {
    return {
      rank: row.rank,
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      communityPoints: row.communityPoints,
      currentLevel: row.currentLevel ?? 0,
      reputation: row.reputation,
      selectedTitle:
        row.titleName && row.titleColor && row.titleBadge
          ? {
              name: row.titleName,
              color: row.titleColor,
              badge: row.titleBadge,
            }
          : null,
    };
  }
}
/**
 * 🏁 The scoreboard borrows facts, not the keys to six neighbouring spacecraft.
 */
