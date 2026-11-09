/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Codec
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/admission-seal.codec.ts
 * 🎯 Purpose: Encodes and verifies the closed Reputation admission descriptor.
 * 🧠 Responsibilities: Copies only declared data, binds identity and checks canonical bytes.
 * 🏗️ Architecture: Root infrastructure codec; no database or owner service calls.
 * ⚠️ Important: Encoding is not producer attestation; prepare must supply verified owned facts.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import type {
  AchievementFactReference,
  QualifiedAchievementCommand,
  QualifiedAchievementEvent,
  QualifiedAchievementFact,
  VerifiedAchievementMapping,
} from '@api/modules/achievements';
import type { ReputationAdmissionSeal } from '../contracts/admission-seal.types';
import { ADMISSION_MAX_BYTES } from '../contracts/consumption.constants';
import { GAMIFICATION_DESTINATION } from '../contracts/routing.constants';
import {
  denseArray,
  exactRecord,
  invalidSeal,
  largeSeal,
  sealChoice,
  sealLiteral,
  sealText,
  sealUuid,
} from './admission-codec-validation';

const canonicalKeys = [
  'eventId',
  'eventName',
  'eventVersion',
  'producer',
  'sourceType',
  'sourceId',
  'occurredAt',
] as const;

function canonical(value: unknown): ReputationAdmissionSeal['canonical'] {
  const row = exactRecord(value, canonicalKeys);
  const occurredAt = sealText(row.occurredAt);
  const timestamp = Date.parse(occurredAt);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString() !== occurredAt
  )
    invalidSeal();
  return {
    eventId: sealUuid(row.eventId),
    eventName: sealChoice(row.eventName, [
      'reputation.direct.changed.v1',
      'reputation.direct.reversed.v1',
    ]),
    eventVersion: sealLiteral(row.eventVersion, 1),
    producer: sealLiteral(row.producer, 'dss.api.reputation'),
    sourceType: sealLiteral(row.sourceType, 'ReputationEntry'),
    sourceId: sealText(row.sourceId),
    occurredAt,
  };
}

function event(value: unknown): QualifiedAchievementEvent {
  const row = exactRecord(value, [...canonicalKeys, 'payload']);
  const { payload: input, ...identity } = row;
  const header = canonical(identity);
  const reversed = header.eventName === 'reputation.direct.reversed.v1';
  const payload = exactRecord(
    input,
    reversed
      ? ['recipientId', 'value', 'reversesEntryId']
      : ['recipientId', 'value'],
  );
  if (payload.value !== -1 && payload.value !== 1) invalidSeal();
  return {
    ...header,
    payload: {
      recipientId: sealText(payload.recipientId),
      value: payload.value,
      ...(reversed
        ? { reversesEntryId: sealText(payload.reversesEntryId) }
        : {}),
    },
  };
}

function reference(value: unknown): AchievementFactReference {
  const row = exactRecord(value, ['producer', 'factId']);
  return {
    producer: sealLiteral(row.producer, 'dss.api.reputation'),
    factId: sealUuid(row.factId),
  };
}

function fact(value: unknown): QualifiedAchievementFact {
  const row = exactRecord(value, [
    'producer',
    'sourceKind',
    'sourceId',
    'factId',
    'canonicalEventId',
    'revision',
    'action',
    'qualificationId',
    'qualificationRevision',
    'qualificationEventId',
    'qualificationFactId',
    'retiredThroughRevision',
    'predecessorWithdrawalFactId',
    'contractVersion',
  ]);
  return {
    producer: sealLiteral(row.producer, 'dss.api.reputation'),
    sourceKind: sealChoice(row.sourceKind, ['ReputationEntry', '@event']),
    sourceId: sealText(row.sourceId),
    factId: sealUuid(row.factId),
    canonicalEventId: sealUuid(row.canonicalEventId),
    revision: sealChoice(row.revision, ['1', '2']),
    action: sealChoice(row.action, ['QUALIFY', 'WITHDRAW']),
    qualificationId: sealUuid(row.qualificationId),
    qualificationRevision: sealLiteral(row.qualificationRevision, '1'),
    qualificationEventId: sealUuid(row.qualificationEventId),
    qualificationFactId: sealUuid(row.qualificationFactId),
    retiredThroughRevision: sealChoice(row.retiredThroughRevision, ['0', '1']),
    predecessorWithdrawalFactId: sealLiteral(
      row.predecessorWithdrawalFactId,
      null,
    ),
    contractVersion: sealLiteral(row.contractVersion, 1),
  };
}

function mapping(value: unknown): VerifiedAchievementMapping {
  const row = exactRecord(value, [
    'awardId',
    'qualification',
    'evidenceId',
    'evidenceDigest',
  ]);
  const digest = sealText(row.evidenceDigest);
  if (!/^[0-9a-f]{64}$/.test(digest)) invalidSeal();
  return {
    awardId: sealText(row.awardId),
    qualification: reference(row.qualification),
    evidenceId: sealText(row.evidenceId),
    evidenceDigest: digest,
  };
}

function command(value: unknown): QualifiedAchievementCommand {
  const row = exactRecord(
    value,
    ['event', 'facts', 'contribution'],
    ['mappings'],
  );
  const facts = denseArray(row.facts, 3);
  if (facts.length === 0) invalidSeal();
  return {
    event: event(row.event),
    facts: facts.map(fact),
    contribution: reference(row.contribution),
    ...(Object.hasOwn(row, 'mappings')
      ? { mappings: denseArray(row.mappings, 64).map(mapping) }
      : {}),
  };
}

function projection(value: unknown): ReputationAdmissionSeal {
  const row = exactRecord(value, [
    'codecVersion',
    'destination',
    'descriptor',
    'canonical',
    'applicability',
    'inputs',
  ]);
  const descriptor = exactRecord(row.descriptor, ['id', 'version']);
  const applicability = exactRecord(row.applicability, [
    'POINTS',
    'LEVELS',
    'ACHIEVEMENTS',
  ]);
  const inputs = exactRecord(row.inputs, ['ACHIEVEMENTS']);
  const achievements = exactRecord(inputs.ACHIEVEMENTS, ['codec', 'command']);
  const header = canonical(row.canonical);
  const owned = command(achievements.command);
  for (const key of canonicalKeys)
    if (header[key] !== owned.event[key]) invalidSeal();
  return {
    codecVersion: sealLiteral(row.codecVersion, 1),
    destination: sealLiteral(row.destination, GAMIFICATION_DESTINATION),
    descriptor: {
      id: sealLiteral(descriptor.id, 'reputation.qualification'),
      version: sealLiteral(descriptor.version, 1),
    },
    canonical: header,
    applicability: {
      POINTS: sealLiteral(applicability.POINTS, false),
      LEVELS: sealLiteral(applicability.LEVELS, false),
      ACHIEVEMENTS: sealLiteral(applicability.ACHIEVEMENTS, true),
    },
    inputs: {
      ACHIEVEMENTS: {
        codec: sealLiteral(achievements.codec, 'achievements.qualified.v1'),
        command: owned,
      },
    },
  };
}

// Only validated, copied, bounded data reaches this recursive encoder.
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(row)
        .sort()
        .map((key) => [key, ordered(row[key])]),
    );
  }
  return value;
}

export function encodeAdmissionSeal(value: unknown) {
  const seal = projection(value);
  const bytes = Buffer.from(JSON.stringify(ordered(seal)), 'utf8');
  if (bytes.byteLength > ADMISSION_MAX_BYTES) largeSeal();
  return {
    projection: seal,
    bytes,
    encodedBytes: bytes.byteLength,
    digest: createHash('sha256').update(bytes).digest(),
  };
}

export function verifyAdmissionSeal(
  value: unknown,
  digest: Uint8Array,
  encodedBytes: number,
): ReputationAdmissionSeal {
  const encoded = encodeAdmissionSeal(value);
  if (
    !(digest instanceof Uint8Array) ||
    digest.byteLength !== 32 ||
    !Number.isSafeInteger(encodedBytes) ||
    encoded.encodedBytes !== encodedBytes ||
    !timingSafeEqual(encoded.digest, Buffer.from(digest))
  )
    invalidSeal();
  return encoded.projection;
}

// A seal has a checksum, not a magic wand. Producer proof still boards separately. 🛰️
