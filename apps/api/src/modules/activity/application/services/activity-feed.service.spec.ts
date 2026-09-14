/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/application/services/activity-feed.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies bounded Activity projection reads.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { ActivityRepository } from '../../domain/repositories/activity.repository.interface';
import { ActivityFeedService } from './activity-feed.service';

describe('ActivityFeedService', () => {
  const activity = {
    findByActor: jest.fn(),
    findFeed: jest.fn(),
    markVisited: jest.fn(),
  } as jest.Mocked<ActivityRepository>;
  const service = new ActivityFeedService(activity);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bounds pagination before reading the projection', async () => {
    activity.findByActor.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    });

    await service.byActor('user-1', -5, 500);

    expect(activity.findByActor.mock.calls).toContainEqual(['user-1', 1, 50]);
  });

  it('normalizes module filters and bounds personalized reads', async () => {
    activity.findFeed.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      unreadCount: 0,
      lastVisitedAt: null,
      generatedAt: new Date(),
      recommendationMode: 'DETERMINISTIC',
    });

    await service.personalizedFeed(
      'user-1',
      [' Forum ', 'forum', 'WIKI'],
      -1,
      100,
    );

    expect(activity.findFeed.mock.calls).toContainEqual([
      {
        viewerId: 'user-1',
        modules: ['FORUM', 'WIKI'],
        page: 1,
        limit: 50,
      },
    ]);
  });

  it('records a visit using a server-owned timestamp', async () => {
    activity.markVisited.mockResolvedValue(new Date());

    await service.markVisited('user-1');

    expect(activity.markVisited.mock.calls[0]?.[0]).toBe('user-1');
    expect(activity.markVisited.mock.calls[0]?.[1]).toBeInstanceOf(Date);
  });
});

/**
 * Even an infinite Universe deserves finite page sizes.
 */
