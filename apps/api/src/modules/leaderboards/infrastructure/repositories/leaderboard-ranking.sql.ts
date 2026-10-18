/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/infrastructure/repositories/leaderboard-ranking.sql.ts
 *
 * 🎯 Purpose:
 * Provides only owned, operation-specific SQL for guarded one-statement ranking composition.
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
