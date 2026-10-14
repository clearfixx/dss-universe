/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/application/services/activity-feed-ranker.service.spec.ts
 *
 * 🎯 Purpose:
 * Pins transferred reason precedence, exact scoring, tie-breaking, pagination and unread policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  ActivityEntry,
  ActivityFeedQuery,
} from '../../domain/types/activity-entry.type';
import type { ActivityViewerContext } from '../../domain/ports/activity-viewer-context.interface';
import { ActivityFeedRankerService } from './activity-feed-ranker.service';
describe('ActivityFeedRankerService', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const ranker = new ActivityFeedRankerService();
  const context: ActivityViewerContext = {
    interests: ['TypeScript'],
    followingIds: ['followed', 'viewer'],
    blockedIds: [],
  };
  const query: ActivityFeedQuery = { viewerId: 'viewer', page: 1, limit: 20 };
  function entry(
    id: string,
    actorId: string,
    metadata: ActivityEntry['metadata'] = null,
    occurredAt = now,
  ): ActivityEntry {
    return {
      id,
      actorId,
      module: 'NEWS',
      action: 'published',
      subjectType: 'NewsArticle',
      subjectId: 'article',
      visibility: 'PUBLIC',
      metadata,
      occurredAt,
    };
  }
  it.each([
    [
      'viewer',
      { mentionedUserId: 'viewer', tags: 'typescript' },
      'OWN_ACTIVITY',
    ],
    ['followed', { mentionedUserId: 'viewer', tags: 'typescript' }, 'MENTION'],
    ['followed', { tags: 'typescript' }, 'FOLLOWING'],
    ['other', { tags: ' rust, TYPESCRIPT, backend ' }, 'INTEREST'],
    ['other', { tags: 42 }, 'RECENT'],
    ['other', { mentionedUserId: 'someone-else', tags: 'rust' }, 'RECENT'],
    ['other', null, 'RECENT'],
  ] as const)(
    'preserves reason precedence for %s/%p',
    (actorId, metadata, reason) => {
      expect(
        ranker.rank(
          [entry('entry', actorId, metadata)],
          query,
          context,
          null,
          now,
        ).items[0]?.reason,
      ).toBe(reason);
    },
  );
  it('preserves weights and rank ordering without promoting own activity above mentions/follows', () => {
    const result = ranker.rank(
      [
        entry('own', 'viewer'),
        entry('mention', 'other', { mentionedUserId: 'viewer' }),
        entry('following', 'followed'),
        entry('interest', 'other', { tags: 'typescript' }),
        entry('recent', 'other'),
      ],
      query,
      context,
      null,
      now,
    );
    expect(result.items.map((item) => [item.id, item.score])).toEqual([
      ['mention', 600],
      ['following', 500],
      ['interest', 400],
      ['own', 300],
      ['recent', 200],
    ]);
    expect(result).toMatchObject({
      total: 5,
      unreadCount: 5,
      recommendationMode: 'DETERMINISTIC',
      generatedAt: now,
    });
  });
  it.each([
    [0, 200],
    [3600000, 150],
    [7200000, 133.333],
    [-3600000, 200],
  ])('retains rounded age weighting at %s milliseconds', (age, score) => {
    const result = ranker.rank(
      [entry('entry', 'other', null, new Date(now.getTime() - age))],
      query,
      context,
      null,
      now,
    );
    expect(result.items[0]?.score).toBe(score);
  });
  it('breaks rounded score ties by occurrence descending then locale ID descending', () => {
    const sameScoreOlder = new Date(now.getTime() - 1);
    const result = ranker.rank(
      [
        entry('a', 'other'),
        entry('z', 'other'),
        entry('zz', 'other', null, sameScoreOlder),
      ],
      query,
      context,
      null,
      now,
    );
    expect(result.items.map((item) => item.id)).toEqual(['z', 'a', 'zz']);
  });
  it('paginates after ranking but counts unread over all candidates with a strict visit boundary', () => {
    const visit = new Date(now.getTime() - 1000);
    const result = ranker.rank(
      [
        entry('new', 'other'),
        entry('equal', 'other', null, visit),
        entry('old', 'other', null, new Date(visit.getTime() - 1)),
      ],
      { ...query, page: 2, limit: 1 },
      context,
      visit,
      now,
    );
    expect(result).toMatchObject({
      total: 3,
      totalPages: 3,
      page: 2,
      limit: 1,
      unreadCount: 1,
      lastVisitedAt: visit,
    });
    expect(result.items[0]).toMatchObject({ id: 'equal', isUnread: false });
    expect(ranker.rank([], query, context, null, now)).toMatchObject({
      total: 0,
      totalPages: 0,
      unreadCount: 0,
    });
  });
  it('never marks guest items unread or infers a mention without a viewer', () => {
    const result = ranker.rank(
      [entry('entry', 'other', { mentionedUserId: 'viewer' })],
      { page: 1, limit: 20 },
      { interests: [], followingIds: [], blockedIds: [] },
      null,
      now,
    );
    expect(result.items[0]).toMatchObject({
      isUnread: false,
      reason: 'RECENT',
    });
    expect(result.unreadCount).toBe(0);
  });
  it('does not mutate candidate order or consumer context arrays', () => {
    const records = [entry('a', 'other'), entry('z', 'followed')];
    const copy = [...records];
    const interests = [...context.interests];
    ranker.rank(records, query, context, null, now);
    expect(records).toEqual(copy);
    expect(context.interests).toEqual(interests);
  });
});
