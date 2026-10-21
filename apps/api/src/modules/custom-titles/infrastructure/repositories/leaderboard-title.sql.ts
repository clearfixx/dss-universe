/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: custom-titles
 * 📄 File: apps/api/src/modules/custom-titles/infrastructure/repositories/leaderboard-title.sql.ts
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

export const leaderboardTitleColumns = Prisma.sql`title."name" AS "titleName", title."color" AS "titleColor", title."badge" AS "titleBadge"`;
export function leaderboardTitleJoins(subjectId: Prisma.Sql) {
  return Prisma.sql`
    LEFT JOIN "user_title_selections" selection ON selection."userId" = ${subjectId}
    LEFT JOIN "user_title_grants" grant_record ON grant_record."id" = selection."grantId"
      AND grant_record."revokedAt" IS NULL
    LEFT JOIN "custom_titles" title ON title."id" = grant_record."titleId"
      AND title."isActive" = true
  `;
}
