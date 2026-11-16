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
export type RoutingSourceCoordinate = Readonly<{
  producer: string;
  eventName: string;
}>;
function eligible(
  coordinates?: readonly RoutingSourceCoordinate[],
): Prisma.Sql {
  if (coordinates === undefined) return Prisma.sql`true`;
  if (
    coordinates.length === 0 ||
    coordinates.length > 64 ||
    coordinates.some(
      (c) =>
        typeof c?.producer !== 'string' ||
        !c.producer ||
        c.producer.length > 128 ||
        typeof c.eventName !== 'string' ||
        !c.eventName ||
        c.eventName.length > 256,
    )
  )
    throw new TypeError('Invalid routing source catalogue.');
  return Prisma.sql`(${Prisma.join(
    coordinates.map(
      (c) =>
        Prisma.sql`(e.producer=${c.producer} AND e."eventName"=${c.eventName})`,
    ),
    ' OR ',
  )})`;
}
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
  coordinates?: readonly RoutingSourceCoordinate[];
}): Prisma.Sql {
  return Prisma.sql`SELECT e.id AS "eventId",e."createdAt" AS "sourceAt"
    ${input.coordinates ? Prisma.sql`,${eligible(input.coordinates)} AS eligible` : Prisma.empty}
    FROM outbox_events e WHERE e."createdAt">=${input.cutoff}
    ${input.after ? Prisma.sql`AND (e."createdAt",e.id)>${input.after}` : Prisma.empty}
    ${input.upper ? Prisma.sql`AND (e."createdAt",e.id)<=${input.upper}` : Prisma.empty}
    ORDER BY e."createdAt",e.id LIMIT ${input.limit}`;
}
