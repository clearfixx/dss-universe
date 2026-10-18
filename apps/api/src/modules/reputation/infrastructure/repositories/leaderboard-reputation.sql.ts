/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: reputation
 * 📄 File: apps/api/src/modules/reputation/infrastructure/repositories/leaderboard-reputation.sql.ts
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

export function leaderboardReputationAggregate(endsAt: Date) {
  return Prisma.sql`
    SELECT entry."recipientId" AS "userId", COALESCE(SUM(entry."value"), 0)::bigint AS reputation
    FROM "reputation_entries" entry
    WHERE entry."createdAt" <= ${endsAt}
    GROUP BY entry."recipientId"
  `;
}
