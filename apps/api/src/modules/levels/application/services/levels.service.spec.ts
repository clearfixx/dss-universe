/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels Tests
 * 📄 File: apps/api/src/modules/levels/application/services/levels.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies level calculation, threshold policy and event-driven transitions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { IntegrationEventJob } from '@dss/jobs';

import type { CommunityPointsService } from '@api/modules/community-points';
import type { UsersService } from '@api/modules/users';

import type { LevelsRepository } from '../../domain/repositories/levels.repository.interface';
import type { LevelDefinition } from '../../domain/types/levels.type';
import { LevelsService } from './levels.service';

const definitions: LevelDefinition[] = [
  {
    level: 1,
    threshold: 10,
    updatedById: null,
    updatedAt: new Date(),
  },
  {
    level: 2,
    threshold: 50,
    updatedById: null,
    updatedAt: new Date(),
  },
  {
    level: 3,
    threshold: 100,
    updatedById: null,
    updatedAt: new Date(),
  },
];

function event(
  overrides: Partial<IntegrationEventJob> = {},
): IntegrationEventJob {
  return {
    eventId: 'points-event-1',
    eventName: 'community-points.awarded.v1',
    eventVersion: 1,
    category: 'integration',
    producer: 'dss.api.community-points',
    payload: { userId: 'user-1', points: 50 },
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('LevelsService', () => {
  const repository = {
    definitions: jest.fn(),
    updateDefinition: jest.fn(),
    sync: jest.fn(),
    history: jest.fn(),
  } as unknown as jest.Mocked<LevelsRepository>;
  const points = {
    balance: jest.fn(),
  } as unknown as jest.Mocked<CommunityPointsService>;
  const users = {
    exists: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
  const service = new LevelsService(repository, points, users);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.definitions.mockResolvedValue(definitions);
    repository.sync.mockResolvedValue({ duplicate: false, transitions: [] });
    points.balance.mockResolvedValue(50);
    users.exists.mockResolvedValue(true);
  });

  it('derives current level and progress from Community Points', async () => {
    await expect(service.progress('user-1')).resolves.toEqual({
      userId: 'user-1',
      balance: 50,
      currentLevel: 2,
      currentThreshold: 50,
      nextLevel: 3,
      nextThreshold: 100,
      pointsIntoLevel: 0,
      pointsNeeded: 50,
      progressPercent: 0,
    });
  });

  it('keeps negative balances at implicit level zero', async () => {
    points.balance.mockResolvedValue(-25);

    await expect(service.progress('user-1')).resolves.toMatchObject({
      balance: -25,
      currentLevel: 0,
      currentThreshold: 0,
      nextLevel: 1,
      pointsIntoLevel: 0,
      pointsNeeded: 35,
      progressPercent: 0,
    });
  });

  it('reports completed progress above the highest threshold', async () => {
    points.balance.mockResolvedValue(500);

    await expect(service.progress('user-1')).resolves.toMatchObject({
      currentLevel: 3,
      nextLevel: null,
      nextThreshold: null,
      pointsNeeded: 0,
      progressPercent: 100,
    });
  });

  it('routes Community Points events to serialized transition sync', async () => {
    await service.consume(event());

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.sync).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'points-event-1',
        userId: 'user-1',
      }),
      2,
      50,
    );
  });

  it('ignores unrelated integration events', async () => {
    await expect(
      service.consume(event({ eventName: 'media.ready.v1' })),
    ).resolves.toEqual({ duplicate: false, transitions: [] });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.sync).not.toHaveBeenCalled();
  });

  it('rejects non-monotonic threshold updates', async () => {
    repository.updateDefinition.mockResolvedValue(null);

    await expect(
      service.updateDefinition(2, 5, 'admin-1'),
    ).rejects.toMatchObject({ status: 409 });
  });
});

/**
 * If Level 3 appears below Level 2, this suite asks navigation to recalculate.
 */
