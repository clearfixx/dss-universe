/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-rating.rules.spec.ts
 *
 * 🎯 Purpose:
 * Verifies content rating eligibility, hot score and top periods.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumCommandError } from './errors/forum-command.error';
import {
  assertCanVote,
  DEFAULT_FORUM_RANKING,
  hotScore,
  normalizeVoteValue,
  topPeriodStart,
  validateRankingSettings,
  type VoteEligibilityFacts,
} from './forum-rating.rules';

describe('forum rating rules', () => {
  const now = new Date('2026-11-21T12:00:00Z');
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
  const facts: VoteEligibilityFacts = {
    voterId: 'voter',
    account: { active: true, createdAt: daysAgo(8) },
    post: { authorId: 'author', state: 'VISIBLE' },
    topicState: 'OPEN',
    now,
  };

  it('allows an eligible vote', () => {
    expect(() => assertCanVote(facts)).not.toThrow();
  });

  it.each([
    [
      'inactive account',
      { account: { active: false, createdAt: daysAgo(30) } },
      'ACCESS_DENIED',
    ],
    ['missing account', { account: null }, 'ACCESS_DENIED'],
    [
      'account younger than 7 days',
      { account: { active: true, createdAt: daysAgo(6.9) } },
      'ACCESS_DENIED',
    ],
    [
      'own post',
      { post: { authorId: 'voter', state: 'VISIBLE' as const } },
      'ACCESS_DENIED',
    ],
    [
      'hidden post',
      { post: { authorId: 'author', state: 'HIDDEN' as const } },
      'NOT_FOUND',
    ],
    ['closed topic', { topicState: 'CLOSED' as const }, 'CONFLICT'],
    ['archived topic', { topicState: 'ARCHIVED' as const }, 'CONFLICT'],
  ])('rejects %s', (_label, override, code) => {
    expect(() => assertCanVote({ ...facts, ...override })).toThrow(
      expect.objectContaining({ code }) as ForumCommandError,
    );
  });

  it('accepts exactly 7 days of membership', () => {
    expect(() =>
      assertCanVote({
        ...facts,
        account: { active: true, createdAt: daysAgo(7) },
      }),
    ).not.toThrow();
  });

  it('accepts only +1 and -1', () => {
    expect(normalizeVoteValue(1)).toBe(1);
    expect(normalizeVoteValue(-1)).toBe(-1);
    for (const value of [0, 2, -2, 0.5]) {
      expect(() => normalizeVoteValue(value)).toThrow(ForumCommandError);
    }
  });

  it('ranks by score magnitude and recency', () => {
    const base = { ratingUp: 0, ratingDown: 0, postCount: 1, createdAt: now };
    const popular = hotScore({ ...base, ratingUp: 100 }, DEFAULT_FORUM_RANKING);
    const fresh = hotScore(base, DEFAULT_FORUM_RANKING);
    const disliked = hotScore(
      { ...base, ratingDown: 100 },
      DEFAULT_FORUM_RANKING,
    );
    expect(popular).toBeGreaterThan(fresh);
    expect(fresh).toBeGreaterThan(disliked);
    const older = hotScore(
      {
        ...base,
        ratingUp: 100,
        createdAt: new Date(now.getTime() - 45_000_000),
      },
      DEFAULT_FORUM_RANKING,
    );
    expect(older).toBeCloseTo(fresh + 1, 5);
  });

  it('computes top period starts', () => {
    expect(topPeriodStart('DAY', now)).toEqual(daysAgo(1));
    expect(topPeriodStart('WEEK', now)).toEqual(daysAgo(7));
    expect(topPeriodStart('ALL', now)).toBeNull();
  });

  it('validates ranking settings bounds', () => {
    expect(() => validateRankingSettings(DEFAULT_FORUM_RANKING)).not.toThrow();
    expect(() =>
      validateRankingSettings({ hotGravitySeconds: 60, hotReplyWeight: 0 }),
    ).toThrow(ForumCommandError);
    expect(() =>
      validateRankingSettings({
        hotGravitySeconds: 45_000,
        hotReplyWeight: 11,
      }),
    ).toThrow(ForumCommandError);
  });
});
