/** DSS Universe — ordered facet recovery and fail-closed owner boundary. */
import { randomUUID } from 'node:crypto';
import { QualifiedPointsService } from './qualified-points.service';
import type { QualifiedPointCommand } from '../../domain/types/qualified-points.type';
import { PointQualificationBlockedError } from '../../domain/errors/point-qualification-blocked.error';
import type { QualifiedPointsRepository } from '../../domain/repositories/qualified-points.repository.interface';

function command(): QualifiedPointCommand {
  const event = {
    eventId: randomUUID(),
    eventName: 'synthetic.points.v1',
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
  const projection = {
    eventName: event.eventName,
    eventVersion: event.eventVersion,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    actorId: event.actorId,
    occurredAt: event.occurredAt,
    value: event.value,
  };
  const fact = {
    producer: event.producer,
    sourceKind: event.sourceType,
    sourceId: event.sourceId,
    factId,
    canonicalEventId: event.eventId,
    revision: '1',
    action: 'QUALIFY' as const,
    qualificationId: factId,
    qualificationRevision: '1',
    qualificationEventId: event.eventId,
    qualificationFactId: factId,
    retiredThroughRevision: '0',
    predecessorWithdrawalFactId: null,
    contractVersion: 1 as const,
    qualification: { ...projection, recipientId },
  };
  return {
    contractVersion: 1,
    event,
    recipientId,
    facts: [fact],
    contribution: { producer: event.producer, factId },
    facets: ['CONTRIBUTION', 'CONTROL'],
  };
}

describe('Qualified Points owner orchestration', () => {
  const consumeFacet = jest.fn<
      ReturnType<QualifiedPointsRepository['consumeFacet']>,
      Parameters<QualifiedPointsRepository['consumeFacet']>
    >(),
    exists = jest.fn<Promise<boolean>, [string]>();
  let service: QualifiedPointsService;
  beforeEach(() => {
    jest.resetAllMocks();
    exists.mockResolvedValue(true);
    consumeFacet.mockImplementation(
      (_command: QualifiedPointCommand, facet: 'CONTROL' | 'CONTRIBUTION') =>
        Promise.resolve({ facet, disposition: 'APPLIED', replayed: false }),
    );
    service = new QualifiedPointsService({ consumeFacet }, { exists });
  });
  it('executes control before contribution regardless of requested order', async () => {
    const input = command();
    expect(await service.advance(input)).toMatchObject({
      status: 'COMPLETE',
      facets: [{ facet: 'CONTROL' }, { facet: 'CONTRIBUTION' }],
    });
    expect(consumeFacet.mock.calls.map((call) => call[1])).toEqual([
      'CONTROL',
      'CONTRIBUTION',
    ]);
    expect(exists).toHaveBeenCalledWith(input.recipientId);
  });
  it('resumes after a failure between independently committed facets without replacing its identity', async () => {
    const failure = Object.freeze({ kind: 'provider-failure' }),
      input = command();
    consumeFacet
      .mockResolvedValueOnce({
        facet: 'CONTROL',
        disposition: 'APPLIED',
        replayed: false,
      })
      .mockRejectedValueOnce(failure);
    await expect(service.advance(input)).rejects.toBe(failure);
    consumeFacet
      .mockResolvedValueOnce({
        facet: 'CONTROL',
        disposition: 'APPLIED',
        replayed: true,
      })
      .mockResolvedValueOnce({
        facet: 'CONTRIBUTION',
        disposition: 'CAPPED',
        replayed: false,
      });
    expect(await service.advance(input)).toEqual({
      status: 'COMPLETE',
      facets: [
        { facet: 'CONTROL', disposition: 'APPLIED', replayed: true },
        { facet: 'CONTRIBUTION', disposition: 'CAPPED', replayed: false },
      ],
    });
  });
  it.each(['CONTROL', 'CONTRIBUTION'] as const)(
    'executes only the applicable %s facet',
    async (facet) => {
      const input = { ...command(), facets: [facet] };
      expect((await service.advance(input)).status).toBe('COMPLETE');
      expect(consumeFacet).toHaveBeenCalledTimes(1);
      expect(consumeFacet.mock.calls[0][1]).toBe(facet);
    },
  );
  it('blocks invalid input before existence or persistence reads', async () => {
    expect(
      await service.advance(null as unknown as QualifiedPointCommand),
    ).toEqual({ status: 'BLOCKED', code: 'INVALID_QUALIFICATION' });
    expect(exists).not.toHaveBeenCalled();
    expect(consumeFacet).not.toHaveBeenCalled();
  });
  it('blocks a missing recipient before any facet effects', async () => {
    exists.mockResolvedValue(false);
    expect(await service.advance(command())).toEqual({
      status: 'BLOCKED',
      code: 'INVALID_QUALIFICATION',
    });
    expect(consumeFacet).not.toHaveBeenCalled();
  });
  it('returns a bounded owner conflict without masking unknown provider failures', async () => {
    consumeFacet.mockRejectedValue(
      new PointQualificationBlockedError('FACT_CONFLICT'),
    );
    expect(await service.advance(command())).toEqual({
      status: 'BLOCKED',
      code: 'FACT_CONFLICT',
    });
    const failure = new Error('existence failure');
    exists.mockRejectedValue(failure);
    await expect(service.advance(command())).rejects.toBe(failure);
  });
});
