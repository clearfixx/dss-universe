/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points Tests
 * 📄 File: apps/api/src/modules/community-points/application/services/community-points.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies event routing, rule validation and compensating reversals.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { IntegrationEventJob } from '@dss/jobs';

import type { UsersService } from '@api/modules/users';

import type { CommunityPointsRepository } from '../../domain/repositories/community-points.repository.interface';
import type {
  CommunityPointEntry,
  CommunityPointRule,
} from '../../domain/types/community-points.type';
import { CommunityPointsService } from './community-points.service';

const rule: CommunityPointRule = {
  key: 'reputation.positive',
  eventName: 'reputation.direct.changed.v1',
  payloadValue: 1,
  points: 10,
  dailyLimit: 25,
  enabled: true,
  updatedById: null,
  updatedAt: new Date(),
};

const entry: CommunityPointEntry = {
  id: 'entry-1',
  userId: 'recipient-1',
  ruleKey: rule.key,
  points: rule.points,
  reason: 'Community activity reward: reputation.positive.',
  sourceEventId: 'event-1',
  sourceEventName: rule.eventName,
  sourceType: 'ReputationEntry',
  sourceId: 'reputation-1',
  actorId: 'actor-1',
  occurredAt: new Date(),
  reversal: null,
};

function event(
  overrides: Partial<IntegrationEventJob> = {},
): IntegrationEventJob {
  return {
    eventId: 'event-1',
    eventName: rule.eventName,
    eventVersion: 1,
    category: 'integration',
    producer: 'dss.api.reputation',
    aggregateType: 'ReputationEntry',
    aggregateId: 'reputation-1',
    actorId: 'actor-1',
    payload: { recipientId: entry.userId, value: 1 },
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('CommunityPointsService', () => {
  const repository = {
    balance: jest.fn(),
    rules: jest.fn(),
    matchingRules: jest.fn(),
    updateRule: jest.fn(),
    award: jest.fn(),
    findOriginalById: jest.fn(),
    reverse: jest.fn(),
    reverseSource: jest.fn(),
    history: jest.fn(),
  } as unknown as jest.Mocked<CommunityPointsRepository>;
  const users = {
    exists: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
  const service = new CommunityPointsService(repository, users);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.matchingRules.mockResolvedValue([rule]);
    repository.award.mockResolvedValue({ status: 'AWARDED', entry });
    users.exists.mockResolvedValue(true);
  });

  it('routes a matching event to an idempotent award boundary', async () => {
    await expect(service.consume(event())).resolves.toEqual({
      status: 'AWARDED',
      entry,
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.award).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: entry.userId,
        rule,
        reason: 'Community activity reward: reputation.positive.',
      }),
    );
  });

  it('ignores integration events without an enabled rule', async () => {
    repository.matchingRules.mockResolvedValue([]);

    await expect(
      service.consume(event({ eventName: 'unrelated.event.v1' })),
    ).resolves.toEqual({ status: 'IGNORED', entry: null });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.award).not.toHaveBeenCalled();
  });

  it('rejects a configured event without a valid recipient', async () => {
    users.exists.mockResolvedValue(false);

    await expect(
      service.consume(event({ payload: { recipientId: 'missing', value: 1 } })),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('routes source reputation reversal to compensating entries', async () => {
    const reversal = {
      ...entry,
      id: 'reversal-1',
      points: -10,
      sourceEventId: null,
      sourceEventName: null,
      reversal: null,
    };
    repository.reverseSource.mockResolvedValue({
      entries: [reversal],
      duplicate: false,
    });

    await expect(
      service.consume(
        event({
          eventId: 'event-2',
          eventName: 'reputation.direct.reversed.v1',
          payload: { reversesEntryId: 'reputation-1' },
        }),
      ),
    ).resolves.toEqual({ status: 'AWARDED', entry: reversal });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.reverseSource).toHaveBeenCalledWith(
      'ReputationEntry',
      'reputation-1',
      'event-2',
      'actor-1',
      'Source reputation decision was reversed.',
      expect.any(Date),
    );
  });

  it('validates rule weights before persistence', async () => {
    await expect(
      service.updateRule(rule.key, 0, 10, true, 'admin-1'),
    ).rejects.toMatchObject({ status: 400 });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.updateRule).not.toHaveBeenCalled();
  });

  it('rejects a second manual reversal', async () => {
    repository.findOriginalById.mockResolvedValue({
      ...entry,
      reversal: {
        id: 'reversal-1',
        actorId: 'moderator-1',
        reason: 'Already corrected.',
        occurredAt: new Date(),
      },
    });

    await expect(
      service.reverse(entry.id, 'moderator-1', 'Another correction.'),
    ).rejects.toMatchObject({ status: 409 });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.reverse).not.toHaveBeenCalled();
  });
});

/**
 * If one event awards twice, this test suite starts flashing red before the
 * leaderboard starts looking suspicious.
 */
