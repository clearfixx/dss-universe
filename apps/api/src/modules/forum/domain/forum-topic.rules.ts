/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-topic.rules.ts
 *
 * 🎯 Purpose:
 * Pure owner-approved rules for topic and post authority.
 *
 * ⚠️ Important:
 * • a topic author edits the first post only until a curator is assigned;
 * • a reply author edits a reply only within 10 minutes;
 * • an author may close but never reopen a topic;
 * • curators and category moderators keep their scoped authority.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumCommandError } from './errors/forum-command.error';
import {
  FORUM_REPLY_EDIT_WINDOW_MS,
  type ForumPostActor,
  type ForumTopicState,
} from './types/forum-topic.type';

type TopicFacts = {
  authorId: string;
  curatorId: string | null;
  state: ForumTopicState;
};

type PostFacts = {
  number: number;
  authorId: string;
  createdAt: Date;
};

export function normalizeTopicTitle(value: string): string {
  const title = value.trim().replace(/\s+/g, ' ');
  if (title.length < 3 || title.length > 200) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'Topic title must contain 3 to 200 characters.',
    );
  }
  return title;
}

export function normalizePostReferences(
  replyToNumber: number | null,
  quotedNumbers: readonly number[],
  nextNumber: number,
): { replyToNumber: number | null; quotedNumbers: number[] } {
  const quotes = [...new Set(quotedNumbers)];
  const references =
    replyToNumber === null ? quotes : [replyToNumber, ...quotes];
  if (quotes.length > 20) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'A post may quote at most 20 earlier posts.',
    );
  }
  if (
    references.some(
      (number) =>
        !Number.isInteger(number) || number < 1 || number >= nextNumber,
    )
  ) {
    throw new ForumCommandError(
      'INVALID_INPUT',
      'Replies and quotes may reference only earlier posts of the topic.',
    );
  }
  return { replyToNumber, quotedNumbers: quotes.sort((a, b) => a - b) };
}

export function canEditPost(
  topic: TopicFacts,
  post: PostFacts,
  actor: ForumPostActor,
  now: Date,
): boolean {
  if (actor.moderator) return true;
  if (post.number === 1) {
    if (topic.curatorId !== null) return topic.curatorId === actor.id;
    return post.authorId === actor.id && topic.state === 'OPEN';
  }
  return (
    post.authorId === actor.id &&
    topic.state === 'OPEN' &&
    now.getTime() - post.createdAt.getTime() <= FORUM_REPLY_EDIT_WINDOW_MS
  );
}

export function canCloseTopic(
  topic: TopicFacts,
  actor: ForumPostActor,
): boolean {
  return (
    topic.state === 'OPEN' &&
    (actor.moderator ||
      topic.authorId === actor.id ||
      topic.curatorId === actor.id)
  );
}

export function canReopenTopic(
  topic: TopicFacts,
  actor: ForumPostActor,
): boolean {
  return (
    topic.state === 'CLOSED' &&
    (actor.moderator || topic.curatorId === actor.id)
  );
}

/** 🔒 Closing a door is everyone's right; reopening it needs a key. */
