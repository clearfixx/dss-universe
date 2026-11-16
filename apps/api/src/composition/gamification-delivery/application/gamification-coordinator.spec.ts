/** Coordinator state-machine tests. Codec validates the synthetic sealed input;
 * actual owner effects and producer authenticity belong to migrated DB tests.
 */
import type {
  GamificationConsumption,
  ConsumptionClaim,
  OwnerCompletion,
} from '../contracts/consumption.types';
import type { QualifiedPointsConsumer } from '@api/modules/community-points';
import type { QualifiedAchievementConsumer } from '@api/modules/achievements';
import type { LevelEventConsumer } from '@api/modules/levels';
import { encodeAdmissionSeal } from '../infrastructure/admission-seal.codec';
import { GamificationCoordinator } from './gamification-coordinator';

const claim: ConsumptionClaim = {
  admissionId: '10000000-0000-0000-0000-000000000001',
  token: '20000000-0000-0000-0000-000000000001',
  epoch: 0n,
  sequence: 1n,
  leaseUntil: '2026-11-16T00:01:00.000Z',
};
function projection(points: boolean) {
  const canonical = {
    eventId: '30000000-0000-0000-0000-000000000001',
    eventName: 'reputation.direct.changed.v1',
    eventVersion: 1,
    producer: 'dss.api.reputation',
    sourceType: 'ReputationEntry',
    sourceId: 'entry',
    occurredAt: '2026-11-16T00:00:00.000Z',
  };
  const fact = {
    producer: canonical.producer,
    sourceKind: 'ReputationEntry',
    sourceId: 'entry',
    factId: '40000000-0000-0000-0000-000000000001',
    canonicalEventId: canonical.eventId,
    revision: '1',
    action: 'QUALIFY',
    qualificationId: '40000000-0000-0000-0000-000000000001',
    qualificationRevision: '1',
    qualificationEventId: canonical.eventId,
    qualificationFactId: '40000000-0000-0000-0000-000000000001',
    retiredThroughRevision: '0',
    predecessorWithdrawalFactId: null,
    contractVersion: 1,
  };
  const contribution = { producer: canonical.producer, factId: fact.factId };
  const achievements = {
    codec: 'achievements.qualified.v1',
    command: {
      event: { ...canonical, payload: { recipientId: 'subject', value: 1 } },
      facts: [fact],
      contribution,
    },
  };
  return encodeAdmissionSeal({
    codecVersion: points ? 2 : 1,
    destination: 'gamification.v1',
    descriptor: { id: 'reputation.qualification', version: points ? 2 : 1 },
    canonical,
    applicability: { POINTS: points, LEVELS: false, ACHIEVEMENTS: true },
    inputs: {
      ACHIEVEMENTS: achievements,
      ...(points
        ? {
            POINTS: {
              codec: 'points.qualified.v1',
              command: {
                contractVersion: 1,
                event: { ...canonical, actorId: 'voter', value: 1 },
                recipientId: 'subject',
                facets: ['CONTRIBUTION'],
                contribution,
                facts: [
                  {
                    ...fact,
                    qualification: {
                      eventName: canonical.eventName,
                      eventVersion: 1,
                      sourceType: canonical.sourceType,
                      sourceId: canonical.sourceId,
                      actorId: 'voter',
                      occurredAt: canonical.occurredAt,
                      value: 1,
                      recipientId: 'subject',
                    },
                  },
                ],
              },
            },
          }
        : {}),
    },
  }).projection;
}
function fixture(withPoints = true) {
  const done = { POINTS: !withPoints, LEVELS: true, ACHIEVEMENTS: false };
  const seal = projection(withPoints);
  const consumption: jest.Mocked<GamificationConsumption> = {
    claim: jest.fn().mockResolvedValue([claim]),
    load: jest.fn().mockImplementation(() =>
      Promise.resolve({
        admissionId: claim.admissionId,
        projection: seal,
        done: { ...done },
        progress: null,
      }),
    ),
    completeOwner: jest
      .fn()
      .mockImplementation(
        (_claim: ConsumptionClaim, outcome: OwnerCompletion) => {
          done[outcome.owner] = true;
          return Promise.resolve('APPLIED');
        },
      ),
    continueOwner: jest.fn().mockResolvedValue('APPLIED'),
    block: jest.fn().mockResolvedValue('APPLIED'),
    fail: jest.fn().mockResolvedValue('APPLIED'),
    recover: jest.fn(),
  };
  const points: jest.Mocked<QualifiedPointsConsumer> = { advance: jest.fn() };
  points.advance.mockResolvedValue({
    status: 'COMPLETE',
    facets: [
      { facet: 'CONTRIBUTION', disposition: 'NO_MATCH', replayed: false },
    ],
  });
  const levels: jest.Mocked<LevelEventConsumer> = { consume: jest.fn() };
  const achievements: jest.Mocked<QualifiedAchievementConsumer> = {
    advance: jest.fn(),
  };
  achievements.advance.mockResolvedValue({
    status: 'COMPLETE',
    consumptions: [],
    examined: 0,
  });
  return {
    consumption,
    points,
    levels,
    achievements,
    service: new GamificationCoordinator(
      consumption,
      points,
      levels,
      achievements,
    ),
  };
}

describe('Gamification coordinator fencing', () => {
  it('processes qualified facets as completion without inventing an award', async () => {
    const f = fixture();
    await expect(f.service.processOne()).resolves.toBe('PROCESSED');
    expect(f.consumption.claim.mock.calls).toEqual([[1]]);
    expect(f.points.advance.mock.calls).toHaveLength(1);
    expect(f.levels.consume.mock.calls).toHaveLength(0);
    expect(
      f.consumption.completeOwner.mock.calls.map((call) => call[1]),
    ).toEqual([
      { owner: 'POINTS', disposition: 'COMPLETE' },
      { owner: 'ACHIEVEMENTS', disposition: 'COMPLETE' },
    ]);
  });
  it('keeps legacy seals free of new Points or Levels effects', async () => {
    const f = fixture(false);
    await expect(f.service.processOne()).resolves.toBe('PROCESSED');
    expect(f.points.advance.mock.calls).toHaveLength(0);
    expect(f.levels.consume.mock.calls).toHaveLength(0);
    expect(f.achievements.advance.mock.calls).toHaveLength(1);
  });
  it('does not call later owners when the token is lost after an owner effect', async () => {
    const f = fixture();
    f.consumption.completeOwner.mockResolvedValue('STALE');
    await expect(f.service.processOne()).resolves.toBe('STALE');
    expect(f.points.advance.mock.calls).toHaveLength(1);
    expect(f.achievements.advance.mock.calls).toHaveLength(0);
  });
  it('checks current ownership again before the next effect', async () => {
    const f = fixture();
    const work = await f.consumption.load(claim);
    f.consumption.load
      .mockReset()
      .mockResolvedValueOnce(work)
      .mockResolvedValue(null);
    await expect(f.service.processOne()).resolves.toBe('STALE');
    expect(f.achievements.advance.mock.calls).toHaveLength(0);
  });
  it('preserves a domain block instead of recording technical failure or completion', async () => {
    const f = fixture();
    f.points.advance.mockResolvedValue({
      status: 'BLOCKED',
      code: 'FACT_CONFLICT',
    });
    await expect(f.service.processOne()).resolves.toBe('BLOCKED');
    expect(f.consumption.block.mock.calls).toEqual([
      [
        claim,
        {
          owner: 'POINTS',
          code: 'FACT_CONFLICT',
        },
      ],
    ]);
    expect(f.consumption.fail.mock.calls).toHaveLength(0);
    expect(f.consumption.completeOwner.mock.calls).toHaveLength(0);
    expect(f.achievements.advance.mock.calls).toHaveLength(0);
  });
  it('persists bounded owner continuation and releases work without recursive looping', async () => {
    const f = fixture(false);
    const progress = {
      scope: {
        producer: 'dss.api.reputation',
        sourceKind: 'ReputationEntry',
        sourceId: 'entry',
      },
      generation: '1',
      sequence: '1',
    };
    f.achievements.advance.mockResolvedValue({
      status: 'CONTINUE',
      progress,
      examined: 64,
    });
    await expect(f.service.processOne()).resolves.toBe('CONTINUED');
    expect(f.consumption.continueOwner.mock.calls).toEqual([
      [
        claim,
        {
          owner: 'ACHIEVEMENTS',
          progress,
        },
      ],
    ]);
    expect(f.consumption.fail.mock.calls).toHaveLength(0);
    expect(f.achievements.advance.mock.calls).toHaveLength(1);
  });
  it('records technical failure without masking the original provider error', async () => {
    const f = fixture();
    const failure = new Error('synthetic owner failure');
    f.points.advance.mockRejectedValue(failure);
    f.consumption.fail.mockRejectedValue(
      new Error('synthetic settlement failure'),
    );
    await expect(f.service.processOne()).rejects.toBe(failure);
    expect(f.consumption.fail.mock.calls).toEqual([[claim, 'OWNER_FAILURE']]);
    expect(f.achievements.advance.mock.calls).toHaveLength(0);
  });
});
