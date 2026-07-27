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
});

/**
 * Even an infinite Universe deserves finite page sizes.
 */
