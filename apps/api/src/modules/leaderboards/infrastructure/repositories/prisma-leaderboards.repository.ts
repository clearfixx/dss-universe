/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/infrastructure/repositories/prisma-leaderboards.repository.ts
 *
 * 🎯 Purpose:
 * Projects deterministic rankings directly from immutable participation data.
 *
 * 🧠 Responsibilities:
 * • aggregates Community Points for one stable time window;
 * • ranks every active member with zero-point inclusion;
 * • enriches cards with all-time level, reputation, and selected title;
 * • returns the requested page and viewer position from one snapshot query.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@api/core/database';

import type { LeaderboardsRepository } from '../../domain/repositories/leaderboards.repository.interface';
import type {
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardQuery,
} from '../../domain/types/leaderboards.type';

type LeaderboardRow = {
  rank: bigint;
  total: bigint;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  communityPoints: bigint;
  allTimePoints: bigint;
  reputation: bigint;
  currentLevel: number | null;
  titleName: string | null;
  titleColor: string | null;
  titleBadge: string | null;
};

@Injectable()
export class PrismaLeaderboardsRepository implements LeaderboardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async page(query: LeaderboardQuery): Promise<LeaderboardPage> {
    const firstRank = (query.page - 1) * query.limit + 1;
    const lastRank = firstRank + query.limit - 1;
    const startsAt = query.startsAt
      ? Prisma.sql`AND entry."occurredAt" >= ${query.startsAt}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<LeaderboardRow[]>(Prisma.sql`
      WITH period_points AS (
        SELECT entry."userId", COALESCE(SUM(entry."points"), 0)::bigint AS points
        FROM "community_point_entries" entry
        WHERE entry."occurredAt" <= ${query.endsAt}
          ${startsAt}
        GROUP BY entry."userId"
      ),
      all_time_points AS (
        SELECT entry."userId", COALESCE(SUM(entry."points"), 0)::bigint AS points
        FROM "community_point_entries" entry
        WHERE entry."occurredAt" <= ${query.endsAt}
        GROUP BY entry."userId"
      ),
      reputation_totals AS (
        SELECT entry."recipientId" AS "userId",
          COALESCE(SUM(entry."value"), 0)::bigint AS reputation
        FROM "reputation_entries" entry
        WHERE entry."createdAt" <= ${query.endsAt}
        GROUP BY entry."recipientId"
      ),
      ranked AS (
        SELECT
          ROW_NUMBER() OVER (
            ORDER BY COALESCE(period.points, 0) DESC, users."createdAt" ASC, users."id" ASC
          )::bigint AS rank,
          COUNT(*) OVER ()::bigint AS total,
          users."id" AS "userId",
          users."username",
          users."displayName",
          users."avatarUrl",
          COALESCE(period.points, 0)::bigint AS "communityPoints",
          COALESCE(all_time.points, 0)::bigint AS "allTimePoints",
          COALESCE(reputation.reputation, 0)::bigint AS reputation
        FROM "users" users
        LEFT JOIN period_points period ON period."userId" = users."id"
        LEFT JOIN all_time_points all_time ON all_time."userId" = users."id"
        LEFT JOIN reputation_totals reputation ON reputation."userId" = users."id"
        WHERE users."status" = 'ACTIVE'
      ),
      enriched AS (
        SELECT
          ranked.*,
          level."level" AS "currentLevel",
          title."name" AS "titleName",
          title."color" AS "titleColor",
          title."badge" AS "titleBadge"
        FROM ranked
        LEFT JOIN LATERAL (
          SELECT definition."level"
          FROM "level_definitions" definition
          WHERE definition."threshold" <= ranked."allTimePoints"
          ORDER BY definition."threshold" DESC
          LIMIT 1
        ) level ON true
        LEFT JOIN "user_title_selections" selection
          ON selection."userId" = ranked."userId"
        LEFT JOIN "user_title_grants" grant_record
          ON grant_record."id" = selection."grantId"
          AND grant_record."revokedAt" IS NULL
        LEFT JOIN "custom_titles" title
          ON title."id" = grant_record."titleId"
          AND title."isActive" = true
      )
      SELECT *
      FROM enriched
      WHERE (rank BETWEEN ${firstRank} AND ${lastRank})
         OR "userId" = ${query.viewerId}
      ORDER BY rank ASC
    `);

    const pageRows = rows.filter(
      (row) => Number(row.rank) >= firstRank && Number(row.rank) <= lastRank,
    );
    const viewer = rows.find((row) => row.userId === query.viewerId);
    const total = rows.length > 0 ? Number(rows[0].total) : 0;

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
      viewerRank: viewer ? Number(viewer.rank) : null,
      viewerCommunityPoints: viewer ? Number(viewer.communityPoints) : null,
    };
  }

  private toEntry(row: LeaderboardRow): LeaderboardEntry {
    return {
      rank: Number(row.rank),
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      communityPoints: Number(row.communityPoints),
      currentLevel: row.currentLevel ?? 0,
      reputation: Number(row.reputation),
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
 * 🏁 Tie-break reminder:
 * points first, then account age, then immutable user id. No mystery score.
 */
