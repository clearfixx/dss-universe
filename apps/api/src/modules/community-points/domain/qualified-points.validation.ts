/** DSS Universe — bounded owner command validation, independent of root codecs. */
import { PointQualificationBlockedError } from './errors/point-qualification-blocked.error';
import type { QualifiedPointCommand } from './types/qualified-points.type';

const maxRevision = 9223372036854775807n;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const qualificationKeys = [
  'eventName',
  'eventVersion',
  'sourceType',
  'sourceId',
  'actorId',
  'occurredAt',
  'value',
  'recipientId',
] as const;
function invalid(): never {
  throw new PointQualificationBlockedError('INVALID_QUALIFICATION');
}
function record(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  )
    invalid();
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(row, key))
  )
    invalid();
  return row;
}
function text(value: unknown, limit = 256): asserts value is string {
  if (typeof value !== 'string' || !value.length || value.length > limit)
    invalid();
}
function id(value: unknown): asserts value is string {
  text(value);
  if (!uuid.test(value)) invalid();
}
function revision(value: unknown, zero = false): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,18})$/.test(value))
    invalid();
  const n = BigInt(value);
  if (n > maxRevision || (!zero && n === 0n)) invalid();
  return n;
}

function validateQualification(value: unknown): Record<string, unknown> {
  const row = record(value, qualificationKeys);
  text(row.eventName);
  text(row.recipientId);
  if (!Number.isSafeInteger(row.eventVersion) || Number(row.eventVersion) < 1)
    invalid();
  if ((row.sourceType === null) !== (row.sourceId === null)) invalid();
  if (row.sourceType !== null) {
    text(row.sourceType, 128);
    text(row.sourceId);
  }
  if (row.actorId !== null) text(row.actorId);
  text(row.occurredAt);
  const time = Date.parse(row.occurredAt);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== row.occurredAt)
    invalid();
  if (
    row.value !== null &&
    (!Number.isInteger(row.value) ||
      Number(row.value) < -2147483648 ||
      Number(row.value) > 2147483647)
  )
    invalid();
  return row;
}

export function validateQualifiedPointCommand(
  value: unknown,
): asserts value is QualifiedPointCommand {
  const row = record(value, [
    'contractVersion',
    'event',
    'recipientId',
    'facts',
    'contribution',
    'facets',
  ]);
  if (row.contractVersion !== 1) invalid();
  text(row.recipientId);
  const event = record(row.event, [
    'eventId',
    'eventName',
    'eventVersion',
    'producer',
    'sourceType',
    'sourceId',
    'actorId',
    'occurredAt',
    'value',
  ]);
  id(event.eventId);
  text(event.eventName);
  text(event.producer, 128);
  if (
    !Number.isSafeInteger(event.eventVersion) ||
    Number(event.eventVersion) < 1
  )
    invalid();
  if ((event.sourceType === null) !== (event.sourceId === null)) invalid();
  if (event.sourceType !== null) {
    text(event.sourceType, 128);
    text(event.sourceId);
  }
  if (event.actorId !== null) text(event.actorId);
  text(event.occurredAt);
  const time = Date.parse(event.occurredAt);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString() !== event.occurredAt
  )
    invalid();
  if (
    event.value !== null &&
    (!Number.isInteger(event.value) ||
      Number(event.value) < -2147483648 ||
      Number(event.value) > 2147483647)
  )
    invalid();
  if (
    !Array.isArray(row.facets) ||
    row.facets.length < 1 ||
    row.facets.length > 2 ||
    new Set(row.facets).size !== row.facets.length ||
    row.facets.some((f: unknown) => f !== 'CONTROL' && f !== 'CONTRIBUTION')
  )
    invalid();
  for (let i = 0; i < row.facets.length; i++)
    if (!Object.hasOwn(row.facets, i)) invalid();
  if (!Array.isArray(row.facts) || row.facts.length < 1 || row.facts.length > 3)
    invalid();
  const identities = new Set<string>();
  for (let i = 0; i < row.facts.length; i++) {
    if (!Object.hasOwn(row.facts, i)) invalid();
    const fact = record(row.facts[i], [
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
      'qualification',
    ]);
    const projection = validateQualification(fact.qualification);
    text(fact.producer, 128);
    text(fact.sourceKind, 128);
    text(fact.sourceId);
    text(fact.qualificationId);
    id(fact.factId);
    id(fact.canonicalEventId);
    id(fact.qualificationEventId);
    id(fact.qualificationFactId);
    if (fact.contractVersion !== 1 || fact.producer !== event.producer)
      invalid();
    if (
      fact.sourceKind === '@event'
        ? fact.sourceId !== fact.qualificationEventId
        : projection.sourceType !== fact.sourceKind ||
          projection.sourceId !== fact.sourceId
    )
      invalid();
    const key = JSON.stringify([fact.producer, fact.factId]);
    if (identities.has(key)) invalid();
    identities.add(key);
    const r = revision(fact.revision),
      q = revision(fact.qualificationRevision),
      retired = revision(fact.retiredThroughRevision, true);
    if (
      retired > r ||
      (fact.action !== 'QUALIFY' && fact.action !== 'WITHDRAW')
    )
      invalid();
    if (fact.predecessorWithdrawalFactId !== null)
      id(fact.predecessorWithdrawalFactId);
    if (
      fact.action === 'QUALIFY' &&
      (r !== q ||
        retired >= q ||
        fact.factId !== fact.qualificationFactId ||
        fact.canonicalEventId !== fact.qualificationEventId)
    )
      invalid();
    if (fact.action === 'WITHDRAW' && (r <= q || retired < q)) invalid();
  }
  const command = value as QualifiedPointCommand;
  if (command.facts.filter((f) => f.action === 'WITHDRAW').length > 1)
    invalid();
  for (const fact of command.facts.filter((f) => f.action === 'WITHDRAW')) {
    const qualifying = command.facts.find(
      (q) =>
        q.producer === fact.producer && q.factId === fact.qualificationFactId,
    );
    if (
      !qualifying ||
      qualifying.action !== 'QUALIFY' ||
      qualifying.sourceKind !== fact.sourceKind ||
      qualifying.sourceId !== fact.sourceId ||
      qualifying.qualificationId !== fact.qualificationId ||
      qualifying.revision !== fact.qualificationRevision ||
      qualifying.canonicalEventId !== fact.qualificationEventId ||
      qualificationKeys.some(
        (key) => qualifying.qualification[key] !== fact.qualification[key],
      )
    )
      invalid();
  }
  if (command.contribution !== null) {
    const ref = record(command.contribution, ['producer', 'factId']);
    text(ref.producer, 128);
    id(ref.factId);
    const fact = command.facts.find(
      (f) => f.producer === ref.producer && f.factId === ref.factId,
    );
    if (
      !fact ||
      fact.action !== 'QUALIFY' ||
      fact.canonicalEventId !== event.eventId
    )
      invalid();
    if (
      qualificationKeys.some(
        (key) =>
          fact.qualification[key] !==
          (key === 'recipientId' ? command.recipientId : command.event[key]),
      )
    )
      invalid();
    if (
      fact.sourceKind === '@event'
        ? fact.sourceId !== event.eventId
        : fact.sourceKind !== event.sourceType ||
          fact.sourceId !== event.sourceId
    )
      invalid();
    if (BigInt(fact.retiredThroughRevision) > 0n) {
      const prior = command.facts.find(
        (f) =>
          f.producer === fact.producer &&
          f.sourceKind === fact.sourceKind &&
          f.sourceId === fact.sourceId &&
          f.action === 'WITHDRAW' &&
          (f.factId === fact.predecessorWithdrawalFactId ||
            BigInt(f.retiredThroughRevision) >=
              BigInt(fact.qualificationRevision)),
      );
      if (
        !prior ||
        prior.action !== 'WITHDRAW' ||
        prior.sourceKind !== fact.sourceKind ||
        prior.sourceId !== fact.sourceId ||
        BigInt(prior.retiredThroughRevision) <
          BigInt(fact.retiredThroughRevision)
      )
        invalid();
    }
  }
  if (command.facets.includes('CONTRIBUTION') && command.contribution === null)
    invalid();
  if (
    !command.facts.some(
      (fact) => fact.canonicalEventId === command.event.eventId,
    )
  )
    invalid();
  for (const fact of command.facts.filter(
    (f) => BigInt(f.retiredThroughRevision) > 0n,
  )) {
    if (
      !command.facts.some(
        (w) =>
          w.action === 'WITHDRAW' &&
          w.producer === fact.producer &&
          w.sourceKind === fact.sourceKind &&
          w.sourceId === fact.sourceId &&
          BigInt(w.retiredThroughRevision) >=
            BigInt(fact.retiredThroughRevision),
      )
    )
      invalid();
  }
  if (
    command.facts.some((f) => BigInt(f.retiredThroughRevision) > 0n) &&
    !command.facets.includes('CONTROL')
  )
    invalid();
}
