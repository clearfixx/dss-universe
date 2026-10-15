/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Comment Write Composition Tests
 * 📄 File: apps/api/src/composition/comment-writes/infrastructure/comment-write-boundaries.spec.ts
 *
 * 🎯 Purpose:
 * Pins semantic write binding, parameterized owner SQL and unchanged handle matching.
 *
 * 🧠 Responsibilities:
 * • verifies same-client callback binding without new transaction options;
 * • verifies one SELECT, empty short-circuit and unmodified provider failures;
 * • checks owned projection values and matcher order/collision rules.
 *
 * 🏗️ Architecture:
 * Pure infrastructure tests; migrated E2E separately proves persistence and rollback.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';
import type { PrismaService } from '@api/core/database';
import type {
  PrismaCommentWriter,
  CommentRecipientResolver,
} from '@api/modules/interactions/infrastructure';
import type { CreateComment } from '@api/modules/interactions';
import { PrismaActiveSubjectSelector } from '@api/modules/auth/infrastructure';
import {
  PrismaMentionProfileSelector,
  MentionRecipientMatcher,
  type MentionProfileCandidate,
} from '@api/modules/users/infrastructure';
import { PrismaCommentWriteTransaction } from './prisma-comment-write.transaction';
import { PrismaMentionRecipientResolver } from './prisma-mention-recipient.resolver';

describe('Comment transaction binding', () => {
  function harness() {
    const client = {} as Prisma.TransactionClient;
    const run = jest
      .fn<
        Promise<unknown>,
        [(client: Prisma.TransactionClient) => Promise<unknown>]
      >()
      .mockImplementation((operation) => operation(client));
    const prisma = { $transaction: run } as unknown as PrismaService;
    const input: CreateComment = {
      interactionTargetId: 'target',
      authorId: 'author',
      parentId: null,
      body: 'Body',
      documentJson: '{}',
      searchText: 'Body',
      mentionedUsernames: ['Pilot'],
    };
    const create = jest
      .fn<
        Promise<unknown>,
        [Prisma.TransactionClient, CreateComment, CommentRecipientResolver]
      >()
      .mockImplementation(async (_tx, content, resolve) => ({
        ids: await resolve(content.mentionedUsernames, content.authorId),
      }));
    const edit = jest
      .fn<
        Promise<unknown>,
        [
          Prisma.TransactionClient,
          string,
          string,
          unknown,
          CommentRecipientResolver,
        ]
      >()
      .mockImplementation(async (_tx, _id, _editor, _content, resolve) => ({
        ids: await resolve(['Pilot'], 'original-author'),
      }));
    const tombstone = jest.fn().mockResolvedValue({ isDeleted: true });
    const writer = {
      create,
      edit,
      tombstone,
    } as unknown as PrismaCommentWriter;
    const resolve = jest.fn().mockResolvedValue(['recipient']);
    const unit = new PrismaCommentWriteTransaction(prisma, writer, {
      resolve,
    } as unknown as PrismaMentionRecipientResolver);
    return { client, run, input, create, edit, tombstone, resolve, unit };
  }
  it('binds create resolution to the same default-isolation write transaction', async () => {
    const h = harness();
    expect(await h.unit.create(h.input)).toEqual({ ids: ['recipient'] });
    expect(h.run).toHaveBeenCalledWith(expect.any(Function));
    expect(h.create).toHaveBeenCalledWith(
      h.client,
      h.input,
      expect.any(Function),
    );
    expect(h.resolve).toHaveBeenCalledWith(h.client, ['Pilot'], 'author');
  });
  it('binds edit resolution to the comment author, not the transition editor', async () => {
    const h = harness();
    const content = { ...h.input };
    expect(await h.unit.edit('comment', 'editor', content)).toEqual({
      ids: ['recipient'],
    });
    expect(h.edit).toHaveBeenCalledWith(
      h.client,
      'comment',
      'editor',
      content,
      expect.any(Function),
    );
    expect(h.resolve).toHaveBeenCalledWith(
      h.client,
      ['Pilot'],
      'original-author',
    );
    expect(h.run).toHaveBeenCalledWith(expect.any(Function));
  });
  it('retains tombstone transaction without a recipient lookup or new options', async () => {
    const h = harness();
    expect(await h.unit.tombstone('comment', 'editor', null)).toEqual({
      isDeleted: true,
    });
    expect(h.tombstone).toHaveBeenCalledWith(
      h.client,
      'comment',
      'editor',
      null,
    );
    expect(h.resolve).not.toHaveBeenCalled();
    expect(h.run).toHaveBeenCalledWith(expect.any(Function));
  });
  it.each(['create', 'edit', 'tombstone'] as const)(
    'propagates %s writer failure',
    async (method) => {
      const h = harness();
      const failure = new Error('Synthetic writer failure');
      h[method].mockRejectedValue(failure);
      const result =
        method === 'create'
          ? h.unit.create(h.input)
          : method === 'edit'
            ? h.unit.edit('comment', 'editor', h.input)
            : h.unit.tombstone('comment', 'editor', 'reason');
      await expect(result).rejects.toBe(failure);
    },
  );
});

describe('Root owned recipient SELECT', () => {
  function harness() {
    const profiles = new PrismaMentionProfileSelector();
    const subjects = new PrismaActiveSubjectSelector();
    const matcher = new MentionRecipientMatcher();
    const rows = [{ id: 'recipient', username: 'Pilot' }];
    const query = jest
      .fn<Promise<MentionProfileCandidate[]>, [Prisma.Sql]>()
      .mockResolvedValue(rows);
    const client = { $queryRaw: query } as unknown as Prisma.TransactionClient;
    const resolver = new PrismaMentionRecipientResolver(
      profiles,
      subjects,
      matcher,
    );
    return { profiles, subjects, matcher, query, client, resolver, rows };
  }
  it('composes one parameterized query and applies the owned matcher after that read', async () => {
    const h = harness();
    const match = jest.spyOn(h.matcher, 'resolve');
    expect(await h.resolver.resolve(h.client, ['Pilot'], 'author')).toEqual([
      'recipient',
    ]);
    expect(h.query).toHaveBeenCalledTimes(1);
    const sql = h.query.mock.calls[0][0];
    expect(sql.values).toEqual(['author', 'Pilot']);
    expect(sql.text).toContain('INNER JOIN');
    expect(sql.text).toContain('ORDER BY profiles."id" ASC');
    expect(sql.text).not.toContain('Pilot');
    expect(match).toHaveBeenCalledWith(['Pilot'], h.rows, 'author');
    expect(match.mock.invocationCallOrder[0]).toBeGreaterThan(
      h.query.mock.invocationCallOrder[0],
    );
  });
  it('skips all selectors, SQL and matching for an empty requested list', async () => {
    const h = harness();
    const p = jest.spyOn(h.profiles, 'candidates');
    const a = jest.spyOn(h.subjects, 'activeIds');
    const m = jest.spyOn(h.matcher, 'resolve');
    expect(await h.resolver.resolve(h.client, [], 'author')).toEqual([]);
    for (const call of [p, a, m, h.query]) expect(call).not.toHaveBeenCalled();
  });
  it.each(['profile', 'subject', 'query', 'matcher'] as const)(
    'propagates %s failure without fallback recipients',
    async (stage) => {
      const h = harness();
      const failure = new Error('Synthetic resolver failure');
      if (stage === 'profile')
        jest.spyOn(h.profiles, 'candidates').mockImplementation(() => {
          throw failure;
        });
      if (stage === 'subject')
        jest.spyOn(h.subjects, 'activeIds').mockImplementation(() => {
          throw failure;
        });
      if (stage === 'matcher')
        jest.spyOn(h.matcher, 'resolve').mockImplementation(() => {
          throw failure;
        });
      if (stage === 'query') h.query.mockRejectedValue(failure);
      await expect(
        h.resolver.resolve(h.client, ['Pilot'], 'author'),
      ).rejects.toBe(failure);
    },
  );
});

describe('Owned technical projections and matcher', () => {
  it('binds hostile handle/author strings as values and keeps Users unaware of status', () => {
    const sql = new PrismaMentionProfileSelector().candidates(
      ["x' OR 1=1 --", 'a_b'],
      'author',
    );
    expect(sql.values).toEqual(['author', "x' OR 1=1 --", 'a_b']);
    expect(sql.text).toContain('SELECT "id", "username"');
    expect(sql.text).not.toContain('status');
    expect(sql.text).not.toContain("x' OR 1=1 --");
    expect(
      new PrismaMentionProfileSelector().candidates([], 'author').text,
    ).toContain('FALSE');
  });
  it('keeps Auth SQL to opaque ACTIVE IDs without handles, secrets or input fragments', () => {
    const sql = new PrismaActiveSubjectSelector().activeIds();
    expect(sql.text).toBe(
      'SELECT "id" FROM "users" WHERE "status" = \'ACTIVE\'',
    );
    expect(sql.values).toEqual([]);
  });
  it.each([
    { names: [], rows: [], ids: [] },
    {
      names: ['Pilot'],
      rows: [
        { id: 'p', username: 'Pilot' },
        { id: 'q', username: 'pilot' },
      ],
      ids: ['p'],
    },
    {
      names: ['pIlOt'],
      rows: [
        { id: 'p', username: 'Pilot' },
        { id: 'q', username: 'pilot' },
      ],
      ids: [],
    },
    { names: ['PILOT'], rows: [{ id: 'p', username: 'Pilot' }], ids: ['p'] },
    {
      names: ['étoile', 'Etoile'],
      rows: [
        { id: 'e', username: 'Étoile' },
        { id: 'n', username: 'Etoile' },
      ],
      ids: ['e', 'n'],
    },
    {
      names: ['a_b'],
      rows: [
        { id: 'literal', username: 'a_b' },
        { id: 'wild', username: 'aZb' },
      ],
      ids: ['literal'],
    },
    {
      names: ['self', 'Second', 'First', 'Second'],
      rows: [
        { id: 'author', username: 'self' },
        { id: 'first', username: 'First' },
        { id: 'second', username: 'Second' },
      ],
      ids: ['second', 'first'],
    },
  ])('preserves matching for $names', ({ names, rows, ids }) => {
    expect(
      new MentionRecipientMatcher().resolve(names, rows, 'author'),
    ).toEqual(ids);
  });
});
