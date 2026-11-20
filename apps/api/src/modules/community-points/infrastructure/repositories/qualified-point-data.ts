/** DSS Universe — private stable projections; a digest does not replace equality. */
import { createHash } from 'node:crypto';
import type { CommunityPointSourceFact, Prisma } from '@prisma/client';
import type {
  PointSourceScope,
  QualifiedPointCommand,
  QualifiedPointFact,
} from '../../domain/types/qualified-points.type';

export function pointScopeKey(scope: PointSourceScope): string {
  return JSON.stringify([scope.producer, scope.sourceKind, scope.sourceId]);
}
export function pointScopes(
  command: QualifiedPointCommand,
): PointSourceScope[] {
  return [
    ...new Map(
      command.facts.map((f) => [
        pointScopeKey(f),
        {
          producer: f.producer,
          sourceKind: f.sourceKind,
          sourceId: f.sourceId,
        },
      ]),
    ).entries(),
  ]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, scope]) => scope);
}
export function pointCanonicalJson(value: unknown): string {
  if (typeof value === 'bigint') return JSON.stringify(value.toString());
  if (Array.isArray(value))
    return '[' + value.map(pointCanonicalJson).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ':' +
            pointCanonicalJson((value as Record<string, unknown>)[key]),
        )
        .join(',') +
      '}'
    );
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined)
    throw new Error('Invalid owned Points projection.');
  return encoded;
}
function digest(value: unknown): string {
  return createHash('sha256').update(pointCanonicalJson(value)).digest('hex');
}
export function pointCommandDigest(command: QualifiedPointCommand): string {
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return digest({
    ...command,
    facets: ['CONTROL', 'CONTRIBUTION'].filter((f) =>
      command.facets.includes(f as 'CONTROL' | 'CONTRIBUTION'),
    ),
    facts: [...command.facts].sort(
      (a, b) =>
        compare(pointScopeKey(a), pointScopeKey(b)) ||
        compare(a.factId, b.factId),
    ),
  });
}
export function pointFactData(fact: QualifiedPointFact, cursorId: string) {
  const data = {
    producer: fact.producer,
    factId: fact.factId,
    cursorId,
    canonicalEventId: fact.canonicalEventId,
    revision: BigInt(fact.revision),
    action: fact.action,
    qualificationId: fact.qualificationId,
    qualificationRevision: BigInt(fact.qualificationRevision),
    qualificationEventId: fact.qualificationEventId,
    qualificationFactId: fact.qualificationFactId,
    retiredThroughRevision: BigInt(fact.retiredThroughRevision),
    predecessorWithdrawalFactId: fact.predecessorWithdrawalFactId,
    contractVersion: fact.contractVersion,
    qualificationProjection: JSON.parse(
      pointCanonicalJson(fact.qualification),
    ) as Prisma.InputJsonObject,
  };
  return { ...data, factDigest: digest(data) };
}
export function samePointFact(
  row: CommunityPointSourceFact,
  data: ReturnType<typeof pointFactData>,
): boolean {
  return (Object.keys(data) as (keyof typeof data)[]).every((key) =>
    key === 'qualificationProjection'
      ? pointCanonicalJson(row[key]) === pointCanonicalJson(data[key])
      : row[key] === data[key],
  );
}
