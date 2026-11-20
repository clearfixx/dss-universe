/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-curation.rules.ts
 *
 * 🎯 Purpose:
 * Pure CH-3a rules for accepted answers, curated tags and topic polls.
 *
 * ⚠️ Important:
 * • author, curator or moderator marks the accepted answer; only a moderator
 *   changes or clears it; the topic is not closed automatically;
 * • the topic author cannot accept their own reply (no self-award);
 * • tags come from the forum's curated list, at most five per topic.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumCommandError } from './errors/forum-command.error';
import type { ForumModerationActor } from './forum-moderation.rules';
import type { ForumTopicKind, ForumPostState } from './types/forum-topic.type';

export const FORUM_MAX_TOPIC_TAGS = 5;

type QuestionFacts = {
  kind: ForumTopicKind;
  authorId: string;
  acceptedAnswerPostId: string | null;
};

export function assertCanAcceptAnswer(
  topic: QuestionFacts,
  answer: {
    topicId: string;
    number: number;
    authorId: string;
    state: ForumPostState;
  },
  topicId: string,
  actor: ForumModerationActor,
): void {
  if (topic.kind !== 'QUESTION') {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'Only question topics have an accepted answer.',
    );
  }
  const mayMark =
    actor.moderator || actor.curator || topic.authorId === actor.id;
  if (!mayMark) {
    throw new ForumCommandError(
      'ACCESS_DENIED',
      'Only the author, the curator or a moderator can accept an answer.',
    );
  }
  if (topic.acceptedAnswerPostId !== null && !actor.moderator) {
    throw new ForumCommandError(
      'ACCESS_DENIED',
      'Only a moderator can change an accepted answer.',
    );
  }
  if (
    answer.topicId !== topicId ||
    answer.number <= 1 ||
    answer.state !== 'VISIBLE'
  ) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'The accepted answer must be a visible reply of this topic.',
    );
  }
  if (answer.authorId === topic.authorId) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'The topic author cannot accept their own reply.',
    );
  }
}

export function normalizeTag(input: { slug: string; label: string }): {
  slug: string;
  label: string;
} {
  const slug = input.slug.trim().toLowerCase();
  const label = input.label.trim();
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(slug)) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'Tag slug must use lowercase letters, digits and hyphens (1–40).',
    );
  }
  if (label.length < 1 || label.length > 40) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'Tag label must contain 1 to 40 characters.',
    );
  }
  return { slug, label };
}

export function normalizeTopicTagIds(tagIds: readonly string[]): string[] {
  const unique = [...new Set(tagIds)];
  if (unique.length > FORUM_MAX_TOPIC_TAGS) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      `A topic may carry at most ${FORUM_MAX_TOPIC_TAGS} tags.`,
    );
  }
  return unique;
}

/** 🏷️ A tag is a promise that you will find this again. */
