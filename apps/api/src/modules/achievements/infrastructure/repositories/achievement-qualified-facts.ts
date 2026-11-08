/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/achievement-qualified-facts.ts
 * 🎯 Purpose: Maps verified owner facts to exact immutable persistence values.
 * 🧠 Responsibilities: Computes diagnostic digests without replacing field-by-field equality.
 * 🏗️ Architecture: Private storage mapping; no producer discovery or eligibility decisions.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createHash } from 'node:crypto';
import type { AchievementSourceFact } from '@prisma/client';
import type {
  AchievementSourceScope,
  QualifiedAchievementFact,
} from '../../domain/types/qualified-achievement.type';

export function achievementScopeKey(scope: AchievementSourceScope): string {
  return JSON.stringify([scope.producer, scope.sourceKind, scope.sourceId]);
}

export function achievementLegacySource(
  sourceType: string | null,
  sourceId: string | null,
  eventId: string,
) {
  return sourceType !== null && sourceId !== null
    ? { sourceKind: sourceType, sourceId }
    : { sourceKind: '@event', sourceId: eventId };
}

export function achievementLegacyCoordinates(
  sourceType: string | null,
  sourceId: string | null,
  eventId: string,
) {
  const coordinates = [{ sourceKind: '@event', sourceId: eventId }];
  if (
    sourceType !== null &&
    sourceId !== null &&
    !(sourceType === '@event' && sourceId === eventId)
  ) {
    coordinates.push({ sourceKind: sourceType, sourceId });
  }
  return coordinates;
}

export function qualifiedFactData(
  fact: QualifiedAchievementFact,
  cursorId: string,
) {
  const data = {
    cursorId,
    producer: fact.producer,
    producerFactId: fact.factId,
    canonicalEventId: fact.canonicalEventId,
    revision: BigInt(fact.revision),
    action: fact.action,
    qualificationId: fact.qualificationId,
    qualificationRevision: BigInt(fact.qualificationRevision),
    qualificationEventId: fact.qualificationEventId,
    qualificationFactId: fact.qualificationFactId,
    retiredThroughRevision: BigInt(fact.retiredThroughRevision),
    predecessorWithdrawalFactId: fact.predecessorWithdrawalFactId,
    codecVersion: fact.contractVersion,
  };
  const encoded = JSON.stringify(data, (_key, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value,
  );
  return {
    ...data,
    factDigest: createHash('sha256').update(encoded).digest('hex'),
  };
}

export function identicalQualifiedFact(
  row: AchievementSourceFact,
  data: ReturnType<typeof qualifiedFactData>,
): boolean {
  return (Object.keys(data) as (keyof typeof data)[]).every(
    (key) => row[key] === data[key],
  );
}

export function qualifiedFactView(
  row: AchievementSourceFact,
  scope: AchievementSourceScope,
): QualifiedAchievementFact {
  if (row.action !== 'QUALIFY' && row.action !== 'WITHDRAW')
    throw new Error('Stored qualification action is invalid.');
  if (row.codecVersion !== 1)
    throw new Error('Stored qualification codec is unsupported.');
  return {
    ...scope,
    factId: row.producerFactId,
    canonicalEventId: row.canonicalEventId,
    revision: row.revision.toString(),
    action: row.action,
    qualificationId: row.qualificationId,
    qualificationRevision: row.qualificationRevision.toString(),
    qualificationEventId: row.qualificationEventId,
    qualificationFactId: row.qualificationFactId,
    retiredThroughRevision: row.retiredThroughRevision.toString(),
    predecessorWithdrawalFactId: row.predecessorWithdrawalFactId,
    contractVersion: 1,
  };
}
