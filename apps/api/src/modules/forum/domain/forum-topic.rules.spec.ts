/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-topic.rules.spec.ts
 *
 * 🎯 Purpose:
 * Verifies owner-approved topic and post authority rules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumCommandError } from './errors/forum-command.error';
import {
  canCloseTopic,
  canEditPost,
  canReopenTopic,
  normalizePostReferences,
  normalizeTopicTitle,
} from './forum-topic.rules';

describe('forum topic rules', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const minutesAgo = (minutes: number) =>
    new Date(now.getTime() - minutes * 60_000);
  const topic = { authorId: 'author', curatorId: null, state: 'OPEN' as const };
  const author = { id: 'author', moderator: false };
  const stranger = { id: 'stranger', moderator: false };
  const moderator = { id: 'moderator', moderator: true };
  const curator = { id: 'curator', moderator: false };

  it('lets the author edit the first post until a curator is assigned', () => {
    const first = { number: 1, authorId: 'author', createdAt: minutesAgo(600) };
    expect(canEditPost(topic, first, author, now)).toBe(true);
    const curated = { ...topic, curatorId: 'curator' };
    expect(canEditPost(curated, first, author, now)).toBe(false);
    expect(canEditPost(curated, first, curator, now)).toBe(true);
    expect(canEditPost(curated, first, moderator, now)).toBe(true);
    expect(canEditPost(topic, first, stranger, now)).toBe(false);
  });

  it('lets a reply author edit for 10 minutes only', () => {
    const reply = (minutes: number) => ({
      number: 2,
      authorId: 'author',
      createdAt: minutesAgo(minutes),
    });
    expect(canEditPost(topic, reply(9), author, now)).toBe(true);
    expect(canEditPost(topic, reply(10), author, now)).toBe(true);
    expect(canEditPost(topic, reply(10.1), author, now)).toBe(false);
    expect(canEditPost(topic, reply(60), moderator, now)).toBe(true);
    expect(canEditPost(topic, reply(1), stranger, now)).toBe(false);
  });

  it('blocks author edits in closed topics', () => {
    const closed = { ...topic, state: 'CLOSED' as const };
    expect(
      canEditPost(
        closed,
        { number: 2, authorId: 'author', createdAt: minutesAgo(1) },
        author,
        now,
      ),
    ).toBe(false);
  });

  it('lets the author close but never reopen a topic', () => {
    expect(canCloseTopic(topic, author)).toBe(true);
    expect(canCloseTopic(topic, stranger)).toBe(false);
    const closed = { ...topic, state: 'CLOSED' as const };
    expect(canReopenTopic(closed, author)).toBe(false);
    expect(canReopenTopic(closed, moderator)).toBe(true);
    expect(canReopenTopic({ ...closed, curatorId: 'curator' }, curator)).toBe(
      true,
    );
  });

  it('normalizes titles', () => {
    expect(normalizeTopicTitle('  Hello   world  ')).toBe('Hello world');
    expect(() => normalizeTopicTitle('ab')).toThrow(ForumCommandError);
    expect(() => normalizeTopicTitle('x'.repeat(201))).toThrow(
      ForumCommandError,
    );
  });

  it('allows references to earlier posts only', () => {
    expect(normalizePostReferences(1, [3, 2, 3], 5)).toEqual({
      replyToNumber: 1,
      quotedNumbers: [2, 3],
    });
    expect(() => normalizePostReferences(5, [], 5)).toThrow(ForumCommandError);
    expect(() => normalizePostReferences(null, [0], 5)).toThrow(
      ForumCommandError,
    );
    expect(() =>
      normalizePostReferences(
        null,
        Array.from({ length: 21 }, (_, i) => i + 1),
        50,
      ),
    ).toThrow(ForumCommandError);
  });
});
