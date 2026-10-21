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
import { ActivityFeedRankerService } from './activity-feed-ranker.service';
import type { ActivityViewerContextReader } from '../../domain/ports/activity-viewer-context.interface';

describe('ActivityFeedService', () => {
  const activity = {
    findByActor: jest.fn(),
    lastVisitedAt: jest.fn(),
    findFeedCandidates: jest.fn(),
    markVisited: jest.fn(),
  } as jest.Mocked<ActivityRepository>;
  const context: jest.Mocked<ActivityViewerContextReader> = {
    readForViewer: jest.fn(),
  };
  const service = new ActivityFeedService(
    activity,
    context,
    new ActivityFeedRankerService(),
  );

  beforeEach(() => {
    jest.resetAllMocks();
    activity.lastVisitedAt.mockResolvedValue(null);
    activity.findFeedCandidates.mockResolvedValue([]);
    context.readForViewer.mockResolvedValue({
      interests: [],
      followingIds: [],
      blockedIds: [],
    });
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
    await service.personalizedFeed(
      'user-1',
      [' Forum ', 'forum', 'WIKI'],
      -1,
      100,
    );

    expect(activity.findFeedCandidates.mock.calls).toContainEqual([
      {
        viewerId: 'user-1',
        modules: ['FORUM', 'WIKI'],
        page: 1,
        limit: 50,
      },
      [],
    ]);
  });

  it('records a visit using a server-owned timestamp', async () => {
    activity.markVisited.mockResolvedValue(new Date());

    await service.markVisited('user-1');

    expect(activity.markVisited.mock.calls[0]?.[0]).toBe('user-1');
    expect(activity.markVisited.mock.calls[0]?.[1]).toBeInstanceOf(Date);
  });

  it('never reads viewer state or Users context for guests', async () => {
    const result = await service.publicFeed([' ', ' wiki '], -5, 100);
    expect(result).toMatchObject({
      page: 1,
      limit: 50,
      unreadCount: 0,
      lastVisitedAt: null,
    });
    expect(context.readForViewer.mock.calls).toHaveLength(0);
    expect(activity.lastVisitedAt.mock.calls).toHaveLength(0);
    expect(activity.findFeedCandidates.mock.calls).toEqual([
      [{ modules: ['WIKI'], page: 1, limit: 50 }, []],
    ]);
  });

  it('orders state, context and candidate reads, passing only blocked IDs to persistence', async () => {
    const order: string[] = [];
    activity.lastVisitedAt.mockImplementation(() => {
      order.push('state');
      return Promise.resolve(null);
    });
    context.readForViewer.mockImplementation(() => {
      order.push('context');
      return Promise.resolve({
        interests: ['TypeScript'],
        followingIds: ['followed'],
        blockedIds: ['blocked'],
      });
    });
    activity.findFeedCandidates.mockImplementation(() => {
      order.push('candidates');
      return Promise.resolve([]);
    });
    await service.personalizedFeed('viewer');
    expect(order).toEqual(['state', 'context', 'candidates']);
    expect(activity.lastVisitedAt.mock.calls).toEqual([['viewer']]);
    expect(context.readForViewer.mock.calls).toEqual([['viewer']]);
    expect(activity.findFeedCandidates.mock.calls[0]?.[1]).toEqual(['blocked']);
  });

  it.each(['state', 'context', 'candidates'])(
    'propagates %s failure without a successful empty projection',
    async (owner) => {
      if (owner === 'state')
        activity.lastVisitedAt.mockRejectedValue(new Error('Unavailable'));
      if (owner === 'context')
        context.readForViewer.mockRejectedValue(new Error('Unavailable'));
      if (owner === 'candidates')
        activity.findFeedCandidates.mockRejectedValue(new Error('Unavailable'));
      await expect(service.personalizedFeed('viewer')).rejects.toThrow(
        'Unavailable',
      );
      if (owner === 'state')
        expect(context.readForViewer.mock.calls).toHaveLength(0);
      if (owner !== 'candidates')
        expect(activity.findFeedCandidates.mock.calls).toHaveLength(0);
    },
  );

  it('caps normalized module filters at twelve and lower-bounds limit', async () => {
    await service.publicFeed(
      Array.from({ length: 15 }, (_, i) => ' module-' + i + ' '),
      3,
      0,
    );
    expect(activity.findFeedCandidates.mock.calls).toEqual([
      [
        {
          modules: Array.from({ length: 12 }, (_, i) => 'MODULE-' + i),
          page: 3,
          limit: 1,
        },
        [],
      ],
    ]);
  });
});

/**
 * Even an infinite Universe deserves finite page sizes.
 */
