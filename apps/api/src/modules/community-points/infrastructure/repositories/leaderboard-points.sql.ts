/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: community-points
 * 📄 File: apps/api/src/modules/community-points/infrastructure/repositories/leaderboard-points.sql.ts
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

export function leaderboardPointsAggregate(
  endsAt: Date,
  startsAt: Date | null,
) {
  const lowerBound = startsAt
    ? Prisma.sql`AND entry."occurredAt" >= ${startsAt}`
    : Prisma.empty;
  return Prisma.sql`
    SELECT entry."userId", COALESCE(SUM(entry."points"), 0)::bigint AS points
    FROM "community_point_entries" entry
    WHERE entry."occurredAt" <= ${endsAt} ${lowerBound}
    GROUP BY entry."userId"
  `;
}
