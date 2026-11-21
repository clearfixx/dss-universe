/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-rating.rules.ts
 *
 * 🎯 Purpose:
 * Pure CH-2 rules: content rating eligibility, hot score and top periods.
 *
 * ⚠️ Important:
 * Votes rate content only. They never change the author's reputation or
 * Community Points (owner correction of decision 6, 2026-11-20).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumCommandError } from './errors/forum-command.error';
import type { ForumPostState, ForumTopicState } from './types/forum-topic.type';

export const FORUM_VOTER_MIN_ACCOUNT_AGE_DAYS = 7;
export const FORUM_TOP_PERIODS = [
  'DAY',
  'WEEK',
  'MONTH',
  'YEAR',
  'ALL',
] as const;
export type ForumTopPeriod = (typeof FORUM_TOP_PERIODS)[number];

export type ForumRankingSettings = {
  hotGravitySeconds: number;
  hotReplyWeight: number;
};

export const DEFAULT_FORUM_RANKING: ForumRankingSettings = {
  hotGravitySeconds: 45_000,
  hotReplyWeight: 0,
};

const DAY_MS = 86_400_000;

export type VoteEligibilityFacts = {
  voterId: string;
  account: { active: boolean; createdAt: Date } | null;
  post: { authorId: string; state: ForumPostState };
  topicState: ForumTopicState;
  now: Date;
};

export function assertCanVote(facts: VoteEligibilityFacts): void {
  if (!facts.account?.active) {
    throw new ForumCommandError('ACCESS_DENIED', 'Sign in to vote.');
  }
  const ageMs = facts.now.getTime() - facts.account.createdAt.getTime();
  if (ageMs < FORUM_VOTER_MIN_ACCOUNT_AGE_DAYS * DAY_MS) {
    throw new ForumCommandError(
      'ACCESS_DENIED',
      `Voting is available after ${FORUM_VOTER_MIN_ACCOUNT_AGE_DAYS} days of membership.`,
    );
  }
  if (facts.post.authorId === facts.voterId) {
    throw new ForumCommandError(
      'ACCESS_DENIED',
      'You cannot rate your own post.',
    );
  }
  if (facts.post.state !== 'VISIBLE') {
    throw new ForumCommandError('NOT_FOUND', 'Post was not found.');
  }
  if (facts.topicState !== 'OPEN') {
    throw new ForumCommandError('CONFLICT', 'Voting is closed for this topic.');
  }
}

export function normalizeVoteValue(value: number): 1 | -1 {
  if (value !== 1 && value !== -1) {
    throw new ForumCommandError('INVALID_INPUT', 'A vote is either +1 or -1.');
  }
  return value;
}

/**
 * Hot score: sign(score)·log10(max(|score|, 1))
 *          + replyWeight·log10(max(posts, 1))
 *          + createdAtSeconds / gravitySeconds.
 * Newer topics win ties; every +10× in score is worth one gravity period.
 */
export function hotScore(
  input: {
    ratingUp: number;
    ratingDown: number;
    postCount: number;
    createdAt: Date;
  },
  settings: ForumRankingSettings,
): number {
  const score = input.ratingUp - input.ratingDown;
  const order = Math.log10(Math.max(Math.abs(score), 1));
  return (
    Math.sign(score) * order +
    settings.hotReplyWeight * Math.log10(Math.max(input.postCount, 1)) +
    input.createdAt.getTime() / 1000 / settings.hotGravitySeconds
  );
}

export function topPeriodStart(period: ForumTopPeriod, now: Date): Date | null {
  const days = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365, ALL: null }[period];
  return days === null ? null : new Date(now.getTime() - days * DAY_MS);
}

export function validateRankingSettings(settings: ForumRankingSettings): void {
  if (
    !Number.isInteger(settings.hotGravitySeconds) ||
    settings.hotGravitySeconds < 3600 ||
    settings.hotGravitySeconds > 2_592_000
  ) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'hotGravitySeconds must be between 3600 and 2592000.',
    );
  }
  if (
    !Number.isInteger(settings.hotReplyWeight) ||
    settings.hotReplyWeight < 0 ||
    settings.hotReplyWeight > 10
  ) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'hotReplyWeight must be an integer between 0 and 10.',
    );
  }
}

/** ⭐ Rate the words, not the writer. */
