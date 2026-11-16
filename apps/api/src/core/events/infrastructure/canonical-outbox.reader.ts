/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Core Events Persistence
 * 📄 File: apps/api/src/core/events/infrastructure/canonical-outbox.reader.ts
 * 🎯 Purpose: Supplies bounded canonical evidence to registered root adapters.
 * 🧠 Responsibilities: Keeps payload parsing and source lookups within Core ownership.
 * 🏗️ Architecture: Transaction-bound technical reader; no feature semantics or raw JSON output.
 * ⚠️ Important: Invalid evidence is explicit; database failures retain their identity.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TransactionClient } from '@api/core/database';

export type CanonicalScalar = string | number | boolean | null;
function scalar(value: unknown): value is CanonicalScalar {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}
export type CanonicalOutboxEvidence = {
  eventId: string;
  producer: string;
  name: string;
  version: number;
  category: string;
  aggregateType: string | null;
  aggregateId: string | null;
  actorId: string | null;
  occurredAt: string;
  createdAt: string;
  payload: Readonly<Record<string, CanonicalScalar>> | null;
};
const select = {
  id: true,
  producer: true,
  eventName: true,
  eventVersion: true,
  eventCategory: true,
  aggregateType: true,
  aggregateId: true,
  actorId: true,
  occurredAt: true,
  createdAt: true,
  payload: true,
} as const;
type StoredEvidence = {
  id: string;
  producer: string;
  eventName: string;
  eventVersion: number;
  eventCategory: string;
  aggregateType: string | null;
  aggregateId: string | null;
  actorId: string | null;
  occurredAt: Date;
  createdAt: Date;
  payload: unknown;
};
type CanonicalCoordinate = {
  producer: string;
  aggregateType: string;
  aggregateId: string;
  eventName: string;
};
export function canonicalOutboxCandidatesQuery(
  coordinate: CanonicalCoordinate,
): Prisma.Sql {
  return Prisma.sql`SELECT id, producer, "eventName", "eventVersion", "eventCategory",
    "aggregateType", "aggregateId", "actorId", "occurredAt", "createdAt", payload
    FROM outbox_events WHERE producer=${coordinate.producer} AND "aggregateType"=${coordinate.aggregateType}
      AND "aggregateId"=${coordinate.aggregateId} AND "eventName"=${coordinate.eventName}
    ORDER BY id LIMIT 2`;
}

export function projectCanonicalEvidence(
  row: StoredEvidence,
  allowedKeys: readonly string[],
): CanonicalOutboxEvidence {
  if (
    allowedKeys.length > 8 ||
    new Set(allowedKeys).size !== allowedKeys.length
  )
    throw new Error('Invalid canonical evidence descriptor.');
  let payload: Record<string, CanonicalScalar> | null = null;
  if (
    row.payload !== null &&
    typeof row.payload === 'object' &&
    !Array.isArray(row.payload)
  ) {
    const entries: [string, unknown][] = Object.entries(row.payload);
    const safe: [string, CanonicalScalar][] = [];
    let valid = entries.length <= allowedKeys.length;
    for (const [key, value] of entries) {
      if (!allowedKeys.includes(key) || !scalar(value)) {
        valid = false;
        break;
      }
      safe.push([key, value]);
    }
    if (valid) payload = Object.fromEntries(safe);
  }
  return {
    eventId: row.id,
    producer: row.producer,
    name: row.eventName,
    version: row.eventVersion,
    category: row.eventCategory,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    actorId: row.actorId,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    payload,
  };
}

function projectSelected(
  row: StoredEvidence,
  keys: readonly string[],
): CanonicalOutboxEvidence {
  const input: unknown = row.payload;
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return projectCanonicalEvidence(row, keys);
  const selected: Record<string, CanonicalScalar> = {};
  for (const key of keys) {
    if (!Object.hasOwn(input, key)) continue;
    const value: unknown = (input as Record<string, unknown>)[key];
    if (!scalar(value))
      return { ...projectCanonicalEvidence(row, []), payload: null };
    selected[key] = value;
  }
  return projectCanonicalEvidence({ ...row, payload: selected }, keys);
}

@Injectable()
export class CanonicalOutboxReader {
  async metadataSelected(
    transaction: TransactionClient,
    eventId: string,
    keys: readonly string[],
  ): Promise<Readonly<Record<string, CanonicalScalar>> | null> {
    if (keys.length > 8 || new Set(keys).size !== keys.length)
      throw new Error('Invalid canonical metadata descriptor.');
    const row = await transaction.outboxEvent.findUnique({
      where: { id: eventId },
      select: { metadata: true },
    });
    const input: unknown = row?.metadata;
    if (!input || typeof input !== 'object' || Array.isArray(input))
      return null;
    const selected: Record<string, CanonicalScalar> = {};
    for (const key of keys) {
      if (!Object.hasOwn(input, key)) continue;
      const value: unknown = (input as Record<string, unknown>)[key];
      if (!scalar(value)) return null;
      selected[key] = value;
    }
    return selected;
  }

  /** Explicit selected-field projection for a registered descriptor. Unlike
   * read(), unrelated producer metadata is omitted rather than reinterpreted.
   * Required fields and their business meaning remain the root adapter's job.
   */
  async readSelected(
    transaction: TransactionClient,
    eventId: string,
    keys: readonly string[],
  ): Promise<CanonicalOutboxEvidence | null> {
    if (keys.length > 8 || new Set(keys).size !== keys.length)
      throw new Error('Invalid canonical evidence descriptor.');
    const row = await transaction.outboxEvent.findUnique({
      where: { id: eventId },
      select,
    });
    if (!row) return null;
    return projectSelected(row, keys);
  }

  async read(
    transaction: TransactionClient,
    eventId: string,
    keys: readonly string[],
  ) {
    const row = await transaction.outboxEvent.findUnique({
      where: { id: eventId },
      select,
    });
    return row ? projectCanonicalEvidence(row, keys) : null;
  }

  async candidates(
    transaction: TransactionClient,
    coordinate: CanonicalCoordinate,
    keys: readonly string[],
  ) {
    // Do not filter malformed versions/payloads before observing ambiguity.
    const rows = await transaction.$queryRaw<StoredEvidence[]>(
      canonicalOutboxCandidatesQuery(coordinate),
    );
    return rows.map((row) => projectCanonicalEvidence(row, keys));
  }

  async candidatesSelected(
    transaction: TransactionClient,
    coordinate: CanonicalCoordinate,
    keys: readonly string[],
  ): Promise<CanonicalOutboxEvidence[]> {
    if (keys.length > 8 || new Set(keys).size !== keys.length)
      throw new Error('Invalid canonical evidence descriptor.');
    const rows = await transaction.$queryRaw<StoredEvidence[]>(
      canonicalOutboxCandidatesQuery(coordinate),
    );
    return rows.map((row) => projectSelected(row, keys));
  }
}
