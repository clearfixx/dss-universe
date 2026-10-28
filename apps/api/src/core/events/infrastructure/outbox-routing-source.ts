/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Events Persistence
 * 📄 File: apps/api/src/core/events/infrastructure/outbox-routing-source.ts
 * 🎯 Purpose: Owns canonical coordinate SQL for technical routing composition.
 * 🧠 Responsibilities: Selects bounded ID/time facts without exposing envelopes.
 * 🏗️ Architecture: Infrastructure-only fragments; never a business contract.
 * ⚠️ Important: Does not change source timestamps or legacy publication state.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';
export function outboxRoutingUpper(cutoff: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`SELECT e.id AS "eventId", e."createdAt" AS "sourceAt"
    FROM outbox_events e WHERE e."createdAt">=${cutoff}
    ORDER BY e."createdAt" DESC,e.id DESC LIMIT 1`;
}
export function outboxRoutingWindow(input: {
  cutoff: Prisma.Sql;
  after?: Prisma.Sql;
  upper?: Prisma.Sql;
  limit: number;
}): Prisma.Sql {
  return Prisma.sql`SELECT e.id AS "eventId",e."createdAt" AS "sourceAt"
    FROM outbox_events e WHERE e."createdAt">=${input.cutoff}
    ${input.after ? Prisma.sql`AND (e."createdAt",e.id)>${input.after}` : Prisma.empty}
    ${input.upper ? Prisma.sql`AND (e."createdAt",e.id)<=${input.upper}` : Prisma.empty}
    ORDER BY e."createdAt",e.id LIMIT ${input.limit}`;
}
