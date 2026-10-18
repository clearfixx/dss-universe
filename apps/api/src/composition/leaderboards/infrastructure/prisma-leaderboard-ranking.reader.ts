/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboard Read Composition
 * 📄 File: apps/api/src/composition/leaderboards/infrastructure/prisma-leaderboard-ranking.reader.ts
 *
 * 🎯 Purpose:
 * Assembles owned ranking fragments in one parameterized statement and returns safe facts.
 *
 * 🧠 Responsibilities:
 * • composes owner SQL under the original statement-level view;
 * • normalizes numeric persistence representations and allowlists facts.
 *
 * 🏗️ Architecture:
 * Root infrastructure adapter implements the Leaderboards-owned input port.
 *
 * ⚠️ Important:
 * No pre-read, transaction, cache, raw SQL or eligibility fallback; preserve bindings and snapshot.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import type {
  LeaderboardQuery,
  LeaderboardRankingFact,
  LeaderboardRankingFacts,
  LeaderboardRankingResult,
} from '@api/modules/leaderboards';
import {
  leaderboardRankingColumns,
  leaderboardPageWithPopulation,
} from '@api/modules/leaderboards/infrastructure';
import {
  leaderboardSubjectSource,
  leaderboardSubjectId,
  leaderboardSubjectAge,
  leaderboardSubjectEligibility,
} from '@api/modules/auth/infrastructure';
import { leaderboardProfileColumns } from '@api/modules/users/infrastructure';
import { leaderboardPointsAggregate } from '@api/modules/community-points/infrastructure';
import { leaderboardReputationAggregate } from '@api/modules/reputation/infrastructure';
import { leaderboardLevelLookup } from '@api/modules/levels/infrastructure';
import {
  leaderboardTitleColumns,
  leaderboardTitleJoins,
} from '@api/modules/custom-titles/infrastructure';

type RankingRow = Omit<
  LeaderboardRankingFact,
  'rank' | 'communityPoints' | 'reputation'
> & {
  rank: bigint;
  populationTotal: bigint;
  communityPoints: bigint;
  reputation: bigint;
};
@Injectable()
export class PrismaLeaderboardRankingReader implements LeaderboardRankingFacts {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: { $queryRaw: PrismaService['$queryRaw'] },
  ) {}

  async read(
    query: Readonly<LeaderboardQuery>,
    firstRank: number,
    lastRank: number,
  ): Promise<LeaderboardRankingResult> {
    const rows = await this.prisma.$queryRaw<
      (RankingRow | { userId: null; populationTotal: bigint })[]
    >(Prisma.sql`
      WITH period_points AS (
        ${leaderboardPointsAggregate(query.endsAt, query.startsAt)}
      ),
      all_time_points AS (
        ${leaderboardPointsAggregate(query.endsAt, null)}
      ),
      reputation_totals AS (
        ${leaderboardReputationAggregate(query.endsAt)}
      ),
      ranked AS (
        SELECT
          ${leaderboardRankingColumns(leaderboardSubjectAge, leaderboardSubjectId)},
          ${leaderboardSubjectId} AS "userId",
          ${leaderboardProfileColumns},
          COALESCE(period.points, 0)::bigint AS "communityPoints",
          COALESCE(all_time.points, 0)::bigint AS "allTimePoints",
          COALESCE(reputation.reputation, 0)::bigint AS reputation
        FROM ${leaderboardSubjectSource}
        LEFT JOIN period_points period ON period."userId" = ${leaderboardSubjectId}
        LEFT JOIN all_time_points all_time ON all_time."userId" = ${leaderboardSubjectId}
        LEFT JOIN reputation_totals reputation ON reputation."userId" = ${leaderboardSubjectId}
        WHERE ${leaderboardSubjectEligibility}
      ),
      enriched AS (
        SELECT ranked.*, level."level" AS "currentLevel", ${leaderboardTitleColumns}
        FROM ranked
        LEFT JOIN LATERAL (
          ${leaderboardLevelLookup(Prisma.sql`ranked."allTimePoints"`)}
        ) level ON true
        ${leaderboardTitleJoins(Prisma.sql`ranked."userId"`)}
      )
      ${leaderboardPageWithPopulation(firstRank, lastRank, query.viewerId)}
    `);
    if (rows.length === 0)
      throw new Error('Missing leaderboard population fact.');
    return {
      total: Number(rows[0].populationTotal),
      rows: rows.flatMap((row) =>
        row.userId === null
          ? []
          : [
              {
                rank: Number(row.rank),
                userId: row.userId,
                username: row.username,
                displayName: row.displayName,
                avatarUrl: row.avatarUrl,
                communityPoints: Number(row.communityPoints),
                reputation: Number(row.reputation),
                currentLevel: row.currentLevel,
                titleName: row.titleName,
                titleColor: row.titleColor,
                titleBadge: row.titleBadge,
              },
            ],
      ),
    };
  }
}
