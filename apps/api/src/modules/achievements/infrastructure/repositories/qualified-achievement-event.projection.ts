/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/qualified-achievement-event.projection.ts
 * 🎯 Purpose: Persists and reads only the safe event shape supplied by the qualified boundary.
 * 🧠 Responsibilities: Provides stable equality/digests and rejects malformed stored projections.
 * 🏗️ Architecture: Private owner storage mapping; never projects an unrestricted legacy payload.
 * ⚠️ Important: Root's reviewed descriptor remains responsible for attesting allowed scalar facts.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createHash } from 'node:crypto';
import type {
  AchievementFactReference,
  QualifiedAchievementEvent,
} from '../../domain/types/qualified-achievement.type';

export type StoredQualifiedEventProjection = {
  formatVersion: 1;
  event: QualifiedAchievementEvent;
  contribution: AchievementFactReference | null;
};

const FIELDS = [
  'eventId',
  'eventName',
  'eventVersion',
  'producer',
  'sourceType',
  'sourceId',
  'occurredAt',
  'payload',
];
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSafeEvent(value: unknown): QualifiedAchievementEvent | null {
  if (
    !record(value) ||
    Object.keys(value).some((key) => !FIELDS.includes(key)) ||
    typeof value.eventId !== 'string' ||
    typeof value.eventName !== 'string' ||
    typeof value.eventVersion !== 'number' ||
    typeof value.producer !== 'string' ||
    typeof value.occurredAt !== 'string' ||
    !record(value.payload) ||
    !(value.sourceType === null || typeof value.sourceType === 'string') ||
    !(value.sourceId === null || typeof value.sourceId === 'string')
  )
    return null;
  const payload: Record<string, string | number | boolean | null> = {};
  for (const [key, scalar] of Object.entries(value.payload)) {
    if (
      scalar !== null &&
      typeof scalar !== 'string' &&
      typeof scalar !== 'boolean' &&
      !(typeof scalar === 'number' && Number.isFinite(scalar))
    )
      return null;
    Object.defineProperty(payload, key, {
      value: scalar,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return {
    eventId: value.eventId,
    eventName: value.eventName,
    eventVersion: value.eventVersion,
    producer: value.producer,
    sourceType: value.sourceType,
    sourceId: value.sourceId,
    occurredAt: value.occurredAt,
    payload,
  };
}

function safeEventKey(event: QualifiedAchievementEvent): string {
  return JSON.stringify([
    event.eventId,
    event.eventName,
    event.eventVersion,
    event.producer,
    event.sourceType,
    event.sourceId,
    event.occurredAt,
    Object.entries(event.payload).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  ]);
}

export function readQualifiedEventProjection(
  value: unknown,
): StoredQualifiedEventProjection | null {
  if (
    !record(value) ||
    value.formatVersion !== 1 ||
    Object.keys(value).some(
      (key) => !['formatVersion', 'event', 'contribution'].includes(key),
    )
  )
    return null;
  const event = readSafeEvent(value.event);
  if (!event) return null;
  const contribution = value.contribution;
  if (contribution === null)
    return { formatVersion: 1, event, contribution: null };
  if (
    !record(contribution) ||
    typeof contribution.producer !== 'string' ||
    typeof contribution.factId !== 'string' ||
    !contribution.producer ||
    !contribution.factId ||
    Object.keys(contribution).some(
      (key) => !['producer', 'factId'].includes(key),
    )
  )
    return null;
  return {
    formatVersion: 1,
    event,
    contribution: {
      producer: contribution.producer,
      factId: contribution.factId,
    },
  };
}

export function qualifiedEventProjectionKey(
  projection: StoredQualifiedEventProjection,
): string {
  return JSON.stringify([
    1,
    safeEventKey(projection.event),
    projection.contribution === null
      ? null
      : [projection.contribution.producer, projection.contribution.factId],
  ]);
}

export function qualifiedEventProjection(
  event: QualifiedAchievementEvent,
  contribution: AchievementFactReference | null,
) {
  const safe = readSafeEvent({
    eventId: event.eventId,
    eventName: event.eventName,
    eventVersion: event.eventVersion,
    producer: event.producer,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    occurredAt: event.occurredAt,
    payload: event.payload,
  });
  if (!safe) throw new Error('Qualified event projection is malformed.');
  const projection: StoredQualifiedEventProjection = {
    formatVersion: 1,
    event: safe,
    contribution,
  };
  const digest = createHash('sha256')
    .update(qualifiedEventProjectionKey(projection))
    .digest('hex');
  return { projection, digest };
}
