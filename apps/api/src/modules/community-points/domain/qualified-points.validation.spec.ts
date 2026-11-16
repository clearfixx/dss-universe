/** DSS Universe — malformed commands fail as owned errors, never incidental JS errors. */
import { randomUUID } from 'node:crypto';
import { validateQualifiedPointCommand } from './qualified-points.validation';
import { PointQualificationBlockedError } from './errors/point-qualification-blocked.error';

function input() {
  const event = {
    eventId: randomUUID(),
    eventName: 'synthetic.v1',
    eventVersion: 1,
    producer: 'synthetic',
    sourceType: 'Document',
    sourceId: randomUUID(),
    actorId: null,
    occurredAt: '2026-11-16T00:00:00.000Z',
    value: null,
  };
  const factId = randomUUID(),
    recipientId = randomUUID();
  return {
    contractVersion: 1,
    event,
    recipientId,
    facts: [
      {
        producer: 'synthetic',
        sourceKind: 'Document',
        sourceId: event.sourceId,
        factId,
        canonicalEventId: event.eventId,
        revision: '1',
        action: 'QUALIFY',
        qualificationId: factId,
        qualificationRevision: '1',
        qualificationEventId: event.eventId,
        qualificationFactId: factId,
        retiredThroughRevision: '0',
        predecessorWithdrawalFactId: null,
        contractVersion: 1,
        qualification: {
          eventName: event.eventName,
          eventVersion: 1,
          sourceType: 'Document',
          sourceId: event.sourceId,
          actorId: null,
          occurredAt: event.occurredAt,
          value: null,
          recipientId,
        },
      },
    ],
    contribution: { producer: 'synthetic', factId },
    facets: ['CONTROL', 'CONTRIBUTION'],
  };
}

describe('Qualified Points input contract', () => {
  it('accepts a bounded complete event without depending on transport types', () =>
    expect(() => validateQualifiedPointCommand(input())).not.toThrow());
  const base = input();
  const invalid: unknown[] = [
    null,
    [],
    {},
    42,
    { ...base, password: 'must not enter the owner' },
    { ...base, contractVersion: 2 },
    { ...base, recipientId: '' },
    { ...base, event: null },
    { ...base, event: { ...base.event, eventId: 'not-a-uuid' } },
    { ...base, event: { ...base.event, eventVersion: 0 } },
    { ...base, event: { ...base.event, sourceType: null } },
    { ...base, event: { ...base.event, actorId: 0 } },
    { ...base, event: { ...base.event, occurredAt: 'yesterday' } },
    { ...base, event: { ...base.event, value: Infinity } },
    { ...base, facets: [] },
    { ...base, facets: ['CONTROL', 'CONTROL'] },
    { ...base, facets: new Array(1) },
    { ...base, facets: [{}] },
    { ...base, facets: ['unknown'] },
    { ...base, facts: null },
    { ...base, facts: [] },
    { ...base, facts: new Array(1) },
    { ...base, facts: [...base.facts, ...base.facts] },
    { ...base, facts: Array.from({ length: 4 }, () => base.facts[0]) },
    ...['0', '01', '-1', '9223372036854775808'].map((revision) => ({
      ...base,
      facts: [{ ...base.facts[0], revision }],
    })),
    { ...base, facts: [{ ...base.facts[0], action: {} }] },
    { ...base, facts: [{ ...base.facts[0], producer: 'different' }] },
    { ...base, facts: [{ ...base.facts[0], qualification: null }] },
    {
      ...base,
      facts: [
        {
          ...base.facts[0],
          qualification: {
            ...base.facts[0].qualification,
            recipientId: randomUUID(),
          },
        },
      ],
    },
    {
      ...base,
      facts: [
        {
          ...base.facts[0],
          qualification: { ...base.facts[0].qualification, value: 'wrong' },
        },
      ],
    },
    { ...base, contribution: null },
    { ...base, contribution: { producer: 'synthetic', factId: randomUUID() } },
  ];
  it.each(invalid.map((value, index) => ({ index, value })))(
    'rejects malformed case $index with an owned failure',
    ({ value }) => {
      expect(() => validateQualifiedPointCommand(value)).toThrow(
        PointQualificationBlockedError,
      );
    },
  );
});
