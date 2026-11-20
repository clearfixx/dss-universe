/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-curation.rules.spec.ts
 *
 * 🎯 Purpose:
 * Verifies accepted-answer authority and tag normalization rules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumCommandError } from './errors/forum-command.error';
import {
  assertCanAcceptAnswer,
  normalizeTag,
  normalizeTopicTagIds,
} from './forum-curation.rules';

describe('forum curation rules', () => {
  const question = {
    kind: 'QUESTION' as const,
    authorId: 'author',
    acceptedAnswerPostId: null,
  };
  const answer = {
    topicId: 't',
    number: 2,
    authorId: 'helper',
    state: 'VISIBLE' as const,
  };
  const actor = (id: string, moderator = false, curator = false) => ({
    id,
    moderator,
    curator,
  });
  const fails = (fn: () => void, code: string) =>
    expect(fn).toThrow(expect.objectContaining({ code }) as ForumCommandError);

  it('lets the author, curator or moderator accept the first answer', () => {
    for (const who of [
      actor('author'),
      actor('c', false, true),
      actor('m', true),
    ]) {
      expect(() =>
        assertCanAcceptAnswer(question, answer, 't', who),
      ).not.toThrow();
    }
    fails(
      () => assertCanAcceptAnswer(question, answer, 't', actor('x')),
      'ACCESS_DENIED',
    );
  });

  it('lets only a moderator change an accepted answer', () => {
    const accepted = { ...question, acceptedAnswerPostId: 'p' };
    fails(
      () => assertCanAcceptAnswer(accepted, answer, 't', actor('author')),
      'ACCESS_DENIED',
    );
    expect(() =>
      assertCanAcceptAnswer(accepted, answer, 't', actor('m', true)),
    ).not.toThrow();
  });

  it('rejects discussions, foreign, first, hidden and self-authored answers', () => {
    const m = actor('m', true);
    fails(
      () =>
        assertCanAcceptAnswer(
          { ...question, kind: 'DISCUSSION' },
          answer,
          't',
          m,
        ),
      'INVALID_INPUT',
    );
    fails(
      () => assertCanAcceptAnswer(question, answer, 'other', m),
      'INVALID_INPUT',
    );
    fails(
      () => assertCanAcceptAnswer(question, { ...answer, number: 1 }, 't', m),
      'INVALID_INPUT',
    );
    fails(
      () =>
        assertCanAcceptAnswer(question, { ...answer, state: 'HIDDEN' }, 't', m),
      'INVALID_INPUT',
    );
    fails(
      () =>
        assertCanAcceptAnswer(
          question,
          { ...answer, authorId: 'author' },
          't',
          m,
        ),
      'INVALID_INPUT',
    );
  });

  it('normalizes tags and limits topic tags to five', () => {
    expect(normalizeTag({ slug: ' NestJS ', label: ' NestJS ' })).toEqual({
      slug: 'nestjs',
      label: 'NestJS',
    });
    expect(() => normalizeTag({ slug: 'bad slug', label: 'x' })).toThrow(
      ForumCommandError,
    );
    expect(normalizeTopicTagIds(['a', 'a', 'b'])).toEqual(['a', 'b']);
    expect(() => normalizeTopicTagIds(['1', '2', '3', '4', '5', '6'])).toThrow(
      ForumCommandError,
    );
  });
});
