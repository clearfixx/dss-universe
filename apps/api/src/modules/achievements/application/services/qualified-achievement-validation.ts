/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/application/services/qualified-achievement-validation.ts
 * 🎯 Purpose: Rejects malformed qualification input before locks, markers or economic writes.
 * 🧠 Responsibilities: Preserves opaque IDs and lossless positive bigint revisions; bounds fact/mapping batches.
 * 🏗️ Architecture: Pure owner validation; no framework or database dependencies.
 * ⚠️ Important: Structural validity does not attest a producer; root canonical verification remains mandatory.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { QualificationBlockedError } from '../../domain/errors/qualification-blocked.error';
import type { QualifiedAchievementCommand } from '../../domain/types/qualified-achievement.type';

const MAX_BIGINT = 9_223_372_036_854_775_807n;
const FACT_LIMIT = 64;
const EVENT_NAME = /^[a-z0-9]+([.-][a-z0-9]+)*\.v[1-9][0-9]*$/;

function invalid(): never {
  throw new QualificationBlockedError('INVALID_QUALIFICATION');
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
function revision(value: unknown, zero = false): bigint {
  if (
    typeof value !== 'string' ||
    value.length > 19 ||
    !(zero ? /^(0|[1-9][0-9]*)$/ : /^[1-9][0-9]*$/).test(value)
  )
    invalid();
  const parsed = BigInt(value);
  if (parsed > MAX_BIGINT) invalid();
  return parsed;
}
function reference(
  value: unknown,
): value is { producer: string; factId: string } {
  return record(value) && text(value.producer) && text(value.factId);
}

export function validateQualifiedAchievementCommand(
  value: unknown,
): asserts value is QualifiedAchievementCommand {
  if (
    !record(value) ||
    !record(value.event) ||
    !Array.isArray(value.facts) ||
    value.facts.length === 0 ||
    value.facts.length > FACT_LIMIT
  )
    invalid();
  const event = value.event;
  if (
    !text(event.eventId) ||
    !text(event.producer) ||
    !text(event.eventName) ||
    !EVENT_NAME.test(event.eventName) ||
    !Number.isSafeInteger(event.eventVersion) ||
    (event.eventVersion as number) < 1 ||
    typeof event.occurredAt !== 'string' ||
    Number.isNaN(new Date(event.occurredAt).getTime()) ||
    !record(event.payload) ||
    !(
      (event.sourceType === null && event.sourceId === null) ||
      (text(event.sourceType) && text(event.sourceId))
    )
  )
    invalid();
  for (const scalar of Object.values(event.payload)) {
    if (
      scalar !== null &&
      typeof scalar !== 'string' &&
      typeof scalar !== 'boolean' &&
      !(typeof scalar === 'number' && Number.isFinite(scalar))
    )
      invalid();
  }
  for (const fact of value.facts) {
    if (
      !record(fact) ||
      ![
        'producer',
        'sourceKind',
        'sourceId',
        'factId',
        'canonicalEventId',
        'qualificationId',
        'qualificationEventId',
        'qualificationFactId',
      ].every((key) => text(fact[key])) ||
      fact.contractVersion !== 1 ||
      !(
        fact.predecessorWithdrawalFactId === null ||
        text(fact.predecessorWithdrawalFactId)
      )
    )
      invalid();
    const current = revision(fact.revision);
    const qualification = revision(fact.qualificationRevision);
    const retired = revision(fact.retiredThroughRevision, true);
    if (qualification > current || retired >= current) invalid();
    if (fact.action === 'QUALIFY') {
      if (
        qualification !== current ||
        fact.qualificationFactId !== fact.factId ||
        fact.qualificationEventId !== fact.canonicalEventId ||
        (retired === 0n
          ? fact.predecessorWithdrawalFactId !== null
          : !text(fact.predecessorWithdrawalFactId))
      )
        invalid();
    } else if (
      fact.action !== 'WITHDRAW' ||
      qualification >= current ||
      retired < qualification
    )
      invalid();
  }
  if (value.contribution !== null) {
    if (!reference(value.contribution)) invalid();
    const contribution = value.contribution;
    const fact: unknown = value.facts.find(
      (candidate: unknown) =>
        record(candidate) &&
        candidate.producer === contribution.producer &&
        candidate.factId === contribution.factId,
    );
    if (
      !record(fact) ||
      fact.action !== 'QUALIFY' ||
      fact.canonicalEventId !== event.eventId ||
      fact.producer !== event.producer ||
      !(
        (fact.sourceKind === event.sourceType &&
          fact.sourceId === event.sourceId) ||
        (fact.sourceKind === '@event' && fact.sourceId === event.eventId)
      )
    )
      invalid();
  }
  if (value.mappings !== undefined) {
    if (!Array.isArray(value.mappings) || value.mappings.length > FACT_LIMIT)
      invalid();
    for (const mapping of value.mappings) {
      if (
        !record(mapping) ||
        !text(mapping.awardId) ||
        !reference(mapping.qualification) ||
        !text(mapping.evidenceId) ||
        typeof mapping.evidenceDigest !== 'string' ||
        !/^[0-9a-f]{64}$/.test(mapping.evidenceDigest)
      )
        invalid();
    }
  }
}
