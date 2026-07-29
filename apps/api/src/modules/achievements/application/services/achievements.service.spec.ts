/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements Tests
 * 📄 File: apps/api/src/modules/achievements/application/services/achievements.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies definition, rule, event routing, manual awards, and rollback policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { IntegrationEventJob } from '@dss/jobs';

import type { UsersService } from '@api/modules/users';

import type { AchievementsRepository } from '../../domain/repositories/achievements.repository.interface';
import type {
  AchievementAward,
  AchievementDefinition,
  AchievementRule,
} from '../../domain/types/achievements.type';
import { AchievementsService } from './achievements.service';

const definition: AchievementDefinition = {
  id: 'achievement-1',
  key: 'community.first-topic',
  name: 'Перший політ',
  slug: 'перший-політ',
  description: 'Published the first Community Hub topic.',
  color: '#7C3AED',
  badge: 'rocket',
  isActive: true,
  createdById: 'admin-1',
  updatedById: 'admin-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const rule: AchievementRule = {
  id: 'rule-1',
  achievementId: definition.id,
  eventName: 'community.topic.published.v1',
  recipientPayloadKey: 'authorId',
  repeatable: false,
  cooldownHours: 0,
  dailyCap: null,
  enabled: true,
  createdById: 'admin-1',
  updatedById: 'admin-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  achievement: definition,
};

const award: AchievementAward = {
  id: 'award-1',
  userId: 'user-1',
  achievementId: definition.id,
  ruleId: rule.id,
  kind: 'RULE',
  reason: 'Matched achievement event.',
  awardedById: null,
  sourceEventId: 'event-1',
  sourceEventName: rule.eventName,
  sourceType: 'CommunityTopic',
  sourceId: 'topic-1',
  awardedAt: new Date(),
  achievement: definition,
  revocation: null,
};

function event(
  overrides: Partial<IntegrationEventJob> = {},
): IntegrationEventJob {
  return {
    eventId: 'event-1',
    eventName: rule.eventName,
    eventVersion: 1,
    category: 'integration',
    producer: 'dss.api.community',
    aggregateType: 'CommunityTopic',
    aggregateId: 'topic-1',
    payload: { authorId: 'user-1' },
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('AchievementsService', () => {
  const repository = {
    definitions: jest.fn(),
    writeDefinition: jest.fn(),
    rules: jest.fn(),
    writeRule: jest.fn(),
    matchingRules: jest.fn(),
    consume: jest.fn(),
    manualAward: jest.fn(),
    revoke: jest.fn(),
    rollbackSource: jest.fn(),
    awards: jest.fn(),
  } as unknown as jest.Mocked<AchievementsRepository>;
  const users = {
    exists: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
  const service = new AchievementsService(repository, users);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.writeDefinition.mockResolvedValue({
      status: 'OK',
      value: definition,
    });
    repository.writeRule.mockResolvedValue({ status: 'OK', value: rule });
    repository.matchingRules.mockResolvedValue([rule]);
    repository.consume.mockResolvedValue({
      ruleId: rule.id,
      status: 'AWARDED',
      award,
    });
    repository.manualAward.mockResolvedValue({ status: 'OK', award });
    repository.revoke.mockResolvedValue({ status: 'OK', award });
    repository.rollbackSource.mockResolvedValue([]);
    users.exists.mockResolvedValue(true);
  });

  it('normalizes Ukrainian definition metadata without damaging its slug', async () => {
    await service.writeDefinition(
      {
        key: ' COMMUNITY.FIRST-TOPIC ',
        name: ' Перший політ ',
        description: ' First topic. ',
        color: '#7c3aed',
        badge: ' rocket ',
      },
      'admin-1',
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.writeDefinition).toHaveBeenCalledWith({
      key: 'community.first-topic',
      name: 'Перший політ',
      slug: 'перший-політ',
      description: 'First topic.',
      color: '#7C3AED',
      badge: 'rocket',
      isActive: true,
      actorId: 'admin-1',
    });
  });

  it('rejects malformed event rule policy', async () => {
    await expect(
      service.writeRule(
        {
          achievementId: definition.id,
          eventName: 'not versioned',
          recipientPayloadKey: 'author.id',
          repeatable: true,
          cooldownHours: -1,
          enabled: true,
        },
        'admin-1',
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('routes a semantic event to every matching rule', async () => {
    repository.matchingRules.mockResolvedValue([
      rule,
      { ...rule, id: 'rule-2', achievementId: 'achievement-2' },
    ]);

    await expect(service.consume(event())).resolves.toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.consume).toHaveBeenCalledTimes(2);
  });

  it('rejects events missing the configured recipient field', async () => {
    await expect(
      service.consume(event({ payload: { userId: 'user-1' } })),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('routes reversal coordinates to source-aware rollback', async () => {
    await service.consume(
      event({
        eventName: 'community.topic.moderated.v1',
        payload: {
          reversedSourceType: 'CommunityTopic',
          reversedSourceId: 'topic-1',
        },
      }),
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.rollbackSource).toHaveBeenCalledWith(
      'CommunityTopic',
      'topic-1',
      'Source rollback from community.topic.moderated.v1.',
      null,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.matchingRules).not.toHaveBeenCalled();
  });

  it('maps duplicate manual awards to conflict', async () => {
    repository.manualAward.mockResolvedValue({
      status: 'CONFLICT',
      award: null,
    });

    await expect(
      service.manualAward(
        'user-1',
        definition.id,
        'Outstanding contribution.',
        'admin-1',
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('requires a reason when revoking an award', async () => {
    await expect(
      service.revoke('award-1', 'no', 'admin-1'),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('maps an already revoked award to conflict', async () => {
    repository.revoke.mockResolvedValue({
      status: 'ALREADY_REVOKED',
      award: null,
    });

    await expect(
      service.revoke('award-1', 'Duplicate evidence.', 'admin-1'),
    ).rejects.toMatchObject({ status: 409 });
  });
});

/**
 * If an achievement starts granting admin rights, this suite revokes reality.
 */
