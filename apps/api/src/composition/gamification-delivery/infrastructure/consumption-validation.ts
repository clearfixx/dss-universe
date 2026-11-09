/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Consumption Persistence
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/consumption-validation.ts
 * 🎯 Purpose: Rejects malformed technical claims, outcomes and progress before persistence.
 * 🧠 Responsibilities: Preserves exact BigInt coordinates and closed owner dispositions.
 * 🏗️ Architecture: Root argument validation, no eligibility or scoring policy.
 * ⚠️ Important: Progress meaning remains owner-local; root does not impose generation ordering.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  AchievementContinuation,
  ConsumptionClaim,
  OwnerBlock,
  OwnerCompletion,
} from '../contracts/consumption.types';
import { exactRecord, sealText } from './admission-codec-validation';

const maximum = 9223372036854775807n;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function assertConsumptionClaim(claim: ConsumptionClaim): void {
  if (
    !claim ||
    typeof claim.admissionId !== 'string' ||
    !uuid.test(claim.admissionId) ||
    typeof claim.token !== 'string' ||
    !uuid.test(claim.token) ||
    typeof claim.epoch !== 'bigint' ||
    claim.epoch < 0n ||
    claim.epoch > maximum ||
    typeof claim.sequence !== 'bigint' ||
    claim.sequence < 1n ||
    claim.sequence > maximum ||
    typeof claim.leaseUntil !== 'string' ||
    !Number.isFinite(Date.parse(claim.leaseUntil))
  )
    throw new TypeError('Invalid consumption claim.');
}

export function assertOwnerCompletion(outcome: OwnerCompletion): void {
  if (
    !outcome ||
    !(
      (outcome.owner === 'POINTS' &&
        [
          'APPLIED',
          'ALREADY_PROCESSED',
          'NO_MATCH',
          'CAPPED',
          'NO_SOURCE_EFFECT',
        ].includes(outcome.disposition)) ||
      (outcome.owner === 'LEVELS' &&
        ['SYNCED', 'ALREADY_PROCESSED', 'NOT_APPLICABLE'].includes(
          outcome.disposition,
        )) ||
      (outcome.owner === 'ACHIEVEMENTS' && outcome.disposition === 'COMPLETE')
    )
  )
    throw new TypeError('Invalid owner completion.');
}

export function assertOwnerBlock(outcome: OwnerBlock): void {
  if (
    !outcome ||
    outcome.owner !== 'ACHIEVEMENTS' ||
    ![
      'INVALID_QUALIFICATION',
      'FACT_CONFLICT',
      'LEGACY_FACT_REQUIRED',
      'BLOCKED_LEGACY_MAPPING',
    ].includes(outcome.code)
  )
    throw new TypeError('Invalid owner block.');
}

export function parseConsumptionProgress(
  value: unknown,
): AchievementContinuation['progress'] {
  const row = exactRecord(value, ['scope', 'generation', 'sequence']);
  const scope = exactRecord(row.scope, ['producer', 'sourceKind', 'sourceId']);
  const generation = sealText(row.generation),
    sequence = sealText(row.sequence);
  if (
    ![generation, sequence].every(
      (text) => /^(0|[1-9][0-9]{0,18})$/.test(text) && BigInt(text) <= maximum,
    )
  )
    throw new TypeError('Invalid owner progress coordinates.');
  return {
    scope: {
      producer: sealText(scope.producer),
      sourceKind: sealText(scope.sourceKind),
      sourceId: sealText(scope.sourceId),
    },
    generation,
    sequence,
  };
}
