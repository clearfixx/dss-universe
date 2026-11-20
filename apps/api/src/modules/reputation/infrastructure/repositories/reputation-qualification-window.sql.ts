/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Reputation Persistence
 * 📄 File: apps/api/src/modules/reputation/infrastructure/repositories/reputation-qualification-window.sql.ts
 * 🎯 Purpose: Reads the bounded owned Q/W/event cohort without unrelated history scans.
 * 🏗️ Architecture: Owned SQL factory, shared with actual query-plan regressions.
 * ⚠️ Important: Four returned rows signal corrupt oversize; the valid cohort has at most three.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';

export function reputationQualificationWindow(
  originalEntryId: string,
  eventBindingId: string,
): Prisma.Sql {
  return Prisma.sql`SELECT b.id,b."eventId",b."entryId",b.kind,b."actorId",b."recipientId",b.value,
    b."originalEntryId",b."occurredAt",b.provenance,b."contractVersion",b."createdAt",
    f.id AS "factId",f.scope AS "factScope",f.revision AS "factRevision",f.action AS "factAction",
    f."qualificationFactId",f."contractVersion" AS "factVersion",qb."eventId" AS "qualificationEventId"
    FROM reputation_qualification_facts f
    JOIN reputation_qualification_events b ON b.id=f."eventBindingId"
    JOIN reputation_qualification_facts q ON q.id=f."qualificationFactId"
    JOIN reputation_qualification_events qb ON qb.id=q."eventBindingId"
    WHERE f."scopeEntryId"=${originalEntryId} OR (f."eventBindingId"=${eventBindingId}::uuid AND f.scope='EVENT')
    ORDER BY f.scope,f.revision LIMIT 4`;
}
