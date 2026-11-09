/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/achievement-source-locks.ts
 * 🎯 Purpose: Serializes source enrolment and provenance before pair/award writes.
 * 🧠 Responsibilities: Uses unambiguous coordinates and deterministic owner-local lock order.
 * 🏗️ Architecture: Private transaction helper; no source lookup or foreign feature knowledge.
 * ⚠️ Important: Acquire every compatibility coordinate before any qualified coordinate.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { TransactionClient } from '@api/core/database';

type SourceCoordinate = { sourceKind: string; sourceId: string };
type QualifiedCoordinate = SourceCoordinate & { producer: string };

async function lockCoordinates(
  transaction: TransactionClient,
  coordinates: string[],
): Promise<void> {
  for (const coordinate of [...new Set(coordinates)].sort()) {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${coordinate}, 0))`;
  }
}

export function lockAchievementCompatibilitySources(
  transaction: TransactionClient,
  sources: readonly SourceCoordinate[],
): Promise<void> {
  return lockCoordinates(
    transaction,
    sources.map(({ sourceKind, sourceId }) =>
      JSON.stringify([
        'achievements:source-compatibility',
        sourceKind,
        sourceId,
      ]),
    ),
  );
}

export function lockAchievementQualifiedSources(
  transaction: TransactionClient,
  sources: readonly QualifiedCoordinate[],
): Promise<void> {
  return lockCoordinates(
    transaction,
    sources.map(({ producer, sourceKind, sourceId }) =>
      JSON.stringify([
        'achievements:qualified-source',
        producer,
        sourceKind,
        sourceId,
      ]),
    ),
  );
}

export function lockAchievementAwardPairs(
  transaction: TransactionClient,
  pairs: readonly { userId: string; achievementId: string }[],
): Promise<void> {
  return lockCoordinates(
    transaction,
    pairs.map(
      ({ userId, achievementId }) =>
        `achievements:award:${userId}:${achievementId}`,
    ),
  );
}

export function lockAchievementRevocations(
  transaction: TransactionClient,
  awardIds: readonly string[],
): Promise<void> {
  return lockCoordinates(
    transaction,
    awardIds.map((id) => `achievements:revoke:${id}`),
  );
}
