/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards
 * 📄 File: apps/api/src/modules/leaderboards/application/services/leaderboards.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies leaderboard pagination and UTC period boundaries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException } from '@nestjs/common';

import type { LeaderboardsRepository } from '../../domain/repositories/leaderboards.repository.interface';
import { LeaderboardsService } from './leaderboards.service';

describe('LeaderboardsService', () => {
  const pageMock = jest.fn<
    ReturnType<LeaderboardsRepository['page']>,
    Parameters<LeaderboardsRepository['page']>
  >();
  const repository = {
    page: pageMock,
  } as jest.Mocked<LeaderboardsRepository>;
  const service = new LeaderboardsService(repository);
  const now = new Date('2026-07-29T12:30:45.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    pageMock.mockResolvedValue({
      period: 'ALL_TIME',
      startsAt: null,
      endsAt: now,
      generatedAt: now,
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      viewerRank: null,
      viewerCommunityPoints: null,
    });
  });

  it.each([
    ['MONTH', '2026-07-01T00:00:00.000Z'],
    ['YEAR', '2026-01-01T00:00:00.000Z'],
  ] as const)('builds the %s UTC window', async (period, startsAt) => {
    await service.page('viewer', period, 2, 10, now);

    expect(pageMock).toHaveBeenCalledWith({
      viewerId: 'viewer',
      period,
      startsAt: new Date(startsAt),
      endsAt: now,
      page: 2,
      limit: 10,
    });
  });

  it('builds an unbounded all-time window', async () => {
    await service.page('viewer', 'ALL_TIME', 1, 20, now);

    expect(pageMock).toHaveBeenCalledWith(
      expect.objectContaining({ startsAt: null, endsAt: now }),
    );
  });

  it.each([
    [0, 20],
    [1, 0],
    [1, 101],
    [1.5, 20],
  ])('rejects invalid pagination', (page, limit) => {
    expect(() => service.page('viewer', 'ALL_TIME', page, limit, now)).toThrow(
      BadRequestException,
    );
  });
});

/**
 * Tests pin the calendar edges so rankings cannot drift between time zones.
 */
