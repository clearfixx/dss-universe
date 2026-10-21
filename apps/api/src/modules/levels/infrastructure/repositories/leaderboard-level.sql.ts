/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: levels
 * 📄 File: apps/api/src/modules/levels/infrastructure/repositories/leaderboard-level.sql.ts
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

export function leaderboardLevelLookup(balance: Prisma.Sql) {
  return Prisma.sql`
    SELECT definition."level"
    FROM "level_definitions" definition
    WHERE definition."threshold" <= ${balance}
    ORDER BY definition."threshold" DESC
    LIMIT 1
  `;
}
