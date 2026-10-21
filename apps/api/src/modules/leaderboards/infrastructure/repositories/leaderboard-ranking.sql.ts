/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/infrastructure/repositories/leaderboard-ranking.sql.ts
 *
 * 🎯 Purpose:
 * Owns deterministic rank ordering and page selection with an independent population total.
 *
 * ⚠️ Important:
 * Fixed aliases and trusted infrastructure expressions only; never accept raw user SQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';

export function leaderboardRankingColumns(
  age: Prisma.Sql,
  subjectId: Prisma.Sql,
) {
  return Prisma.sql`
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(period.points, 0) DESC, ${age} ASC, ${subjectId} ASC
    )::bigint AS rank,
    COUNT(*) OVER ()::bigint AS total`;
}

export function leaderboardPageWithPopulation(
  firstRank: number,
  lastRank: number,
  viewerId: string,
) {
  return Prisma.sql`
    SELECT page.*, population."populationTotal"
    FROM (
      SELECT COALESCE((SELECT total FROM ranked LIMIT 1), 0)::bigint AS "populationTotal"
    ) population
    LEFT JOIN LATERAL (
      SELECT * FROM enriched
      WHERE (rank BETWEEN ${firstRank} AND ${lastRank})
         OR "userId" = ${viewerId}
    ) page ON true
    ORDER BY rank ASC
  `;
}
