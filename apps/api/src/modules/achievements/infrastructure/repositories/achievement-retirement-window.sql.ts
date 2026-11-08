/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/achievement-retirement-window.sql.ts
 * 🎯 Purpose: Selects one fixed-size retirement page through the owned immutable binding index.
 * 🏗️ Architecture: Private SQL factory shared by production and actual query-plan verification.
 * ⚠️ Important: The tuple predicate must remain indexable; do not filter active awards before LIMIT.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';

export const QUALIFICATION_HISTORY_PAGE_SIZE = 64;
export function achievementInventoryWindow(input: {
  sourceKind: string;
  sourceId: string;
  afterId: string | null;
}): Prisma.Sql {
  const source =
    input.sourceKind === '@event'
      ? Prisma.sql`"sourceEventId" = ${input.sourceId}`
      : Prisma.sql`"sourceType" = ${input.sourceKind} AND "sourceId" = ${input.sourceId}`;
  const frontier =
    input.afterId === null
      ? Prisma.empty
      : Prisma.sql`AND "id" > ${input.afterId}`;
  return Prisma.sql`SELECT "id" FROM "achievement_awards" WHERE "kind" = 'RULE'
    AND ${source} ${frontier} ORDER BY "id" LIMIT ${QUALIFICATION_HISTORY_PAGE_SIZE}`;
}
export function achievementRetirementWindow(input: {
  cursorId: string;
  retiredThrough: bigint;
  after: { revision: bigint; awardId: string } | null;
}): Prisma.Sql {
  const frontier =
    input.after === null
      ? Prisma.empty
      : Prisma.sql`
    AND ("qualificationRevision", "awardId") > (${input.after.revision}, ${input.after.awardId})`;
  return Prisma.sql`
    SELECT "awardId", "qualificationRevision" FROM "achievement_award_qualifications"
    WHERE "cursorId" = ${input.cursorId} AND "qualificationRevision" <= ${input.retiredThrough}
    ${frontier} ORDER BY "qualificationRevision", "awardId" LIMIT ${QUALIFICATION_HISTORY_PAGE_SIZE}`;
}
