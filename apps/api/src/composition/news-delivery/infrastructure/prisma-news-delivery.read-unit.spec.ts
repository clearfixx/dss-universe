/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Delivery Composition Tests
 * 📄 File: apps/api/src/composition/news-delivery/infrastructure/prisma-news-delivery.read-unit.spec.ts
 *
 * 🎯 Purpose:
 * Pins root snapshot wiring, response mapping and fail-closed owner evidence.
 *
 * 🧠 Responsibilities:
 * • checks every composed operation passes one shared transaction to owner adapters;
 * • verifies identity-field removal, ordered hydration and unavailable short-circuits.
 *
 * 🏗️ Architecture:
 * Pure composition tests; real migrated E2E separately proves isolation and SQL behavior.
 *
 * ⚠️ Important:
 * Transaction mocks do not certify PostgreSQL snapshots or successful authorization.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';
import type { PrismaService } from '@api/core/database';
import type {
  NewsDeliveryContent,
  PrismaNewsDeliveryRepository,
} from '@api/modules/news/infrastructure';
import type { InteractionDeliveryComment } from '@api/modules/interactions/infrastructure';
import { PrismaNewsDeliveryReadUnit } from './prisma-news-delivery.read-unit';

function harness() {
  const client = {} as Prisma.TransactionClient;
  const transaction = jest
    .fn<
      Promise<unknown>,
      [(tx: Prisma.TransactionClient) => Promise<unknown>, unknown]
    >()
    .mockImplementation((read) => read(client));
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  const record: NewsDeliveryContent = {
    id: 'article',
    interactionTargetId: 'target',
    authorId: 'author',
    postType: 'STANDARD',
    visibility: 'PUBLIC',
    language: 'uk',
    slug: 'article',
    title: 'Article',
    shortText: 'Summary',
    coverMediaId: null,
    publishedAt: new Date(),
    displayPublishedAt: new Date(),
    featured: false,
    pin: null,
    primaryCategory: null,
    tags: [],
  };
  const profile = {
    id: 'author',
    username: 'pilot',
    displayName: null,
    avatarUrl: null,
    avatarMediaId: null,
  };
  const engagement = {
    viewCount: 0,
    commentCount: 0,
    upvotes: 1,
    downvotes: 0,
    score: 1,
    bookmarkedByViewer: false,
    viewerReaction: null,
  };
  const page = {
    items: [record],
    pinnedItems: [{ ...record, id: 'pin' }],
    hasNextPage: true,
  };
  const number = { ...page, page: 2, pageSize: 3, total: 4, totalPages: 2 };
  const full = {
    ...record,
    documentJson: '{}',
    templateDataJson: '{}',
    allowComments: true,
    allowRating: true,
    allowSharing: true,
    allowIndexing: true,
    related: [],
  };
  const news = {
    browseShort: jest.fn().mockResolvedValue(page),
    browseShortNumbered: jest.fn().mockResolvedValue(number),
    chronologicalNavigation: jest
      .fn()
      .mockResolvedValue({ previous: null, next: null }),
    findFullBySlug: jest.fn().mockResolvedValue(full),
    eligibleTarget: jest
      .fn()
      .mockResolvedValue({ interactionTargetId: 'target' }),
  };
  const profiles = {
    read: jest.fn().mockResolvedValue(new Map([['author', profile]])),
  };
  const comment: InteractionDeliveryComment = {
    id: 'comment',
    reactionTargetId: 'comment-target',
    parentId: null,
    authorId: 'author',
    body: 'Body',
    documentJson: '{}',
    isDeleted: false,
    editedAt: null,
    createdAt: new Date(),
    engagement: { upvotes: 0, downvotes: 0, score: 0, viewerReaction: null },
    children: [],
  };
  const votePage = {
    items: [
      {
        id: 'vote',
        actorId: 'author',
        kind: 'UPVOTE',
        updatedAt: new Date(),
      },
    ],
    page: 2,
    pageSize: 3,
    total: 4,
    totalPages: 2,
  };
  const commentPage = {
    items: [
      {
        ...comment,
        children: [{ ...comment, id: 'reply', parentId: 'comment' }],
      },
    ],
    page: 2,
    pageSize: 3,
    total: 4,
    totalPages: 2,
  };
  const interactions = {
    summaries: jest.fn().mockResolvedValue(new Map([['target', engagement]])),
    shares: jest.fn().mockResolvedValue({ total: 0, channels: [] }),
    ratingPage: jest.fn().mockResolvedValue(votePage),
    commentsPage: jest.fn().mockResolvedValue(commentPage),
  };
  const reader = new PrismaNewsDeliveryReadUnit(
    prisma,
    news as unknown as PrismaNewsDeliveryRepository,
    profiles,
    interactions,
  );
  return {
    reader,
    client,
    transaction,
    prisma,
    news,
    profiles,
    interactions,
    record,
    page,
    number,
    full,
  };
}

describe('PrismaNewsDeliveryReadUnit', () => {
  it.each(['cursor', 'numbered', 'full', 'votes', 'comments'] as const)(
    'uses explicit scoped Repeatable Read for %s without custom timeouts',
    async (operation) => {
      const h = harness();
      if (operation === 'cursor')
        await h.reader.browseShort({ first: 3, viewerId: 'viewer' });
      else if (operation === 'numbered')
        await h.reader.browseShortNumbered({
          page: 2,
          pageSize: 3,
          viewerId: 'viewer',
        });
      else if (operation === 'full')
        await h.reader.findFullBySlug('uk', 'article', 'viewer');
      else if (operation === 'votes')
        await h.reader.ratingVotes('article', 2, 3, 'viewer');
      else await h.reader.comments('article', 2, 3, 'viewer');
      expect(h.transaction).toHaveBeenCalledTimes(1);
      expect(h.transaction.mock.calls[0][1]).toEqual({
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      });
      for (const mock of [
        ...Object.values(h.news),
        h.profiles.read,
        ...Object.values(h.interactions),
      ]) {
        const calls = mock.mock.calls as unknown[][];
        for (const call of calls) expect(call[0]).toBe(h.client);
      }
    },
  );
  it('leaves News-only navigation outside the composed snapshot policy', async () => {
    const h = harness();
    expect(await h.reader.chronologicalNavigation('article')).toEqual({
      previous: null,
      next: null,
    });
    expect(h.news.chronologicalNavigation).toHaveBeenCalledWith(
      h.prisma,
      'article',
    );
    expect(h.transaction).not.toHaveBeenCalled();
  });
  it('hydrates ordered items/pins in one batch without leaking authorId', async () => {
    const h = harness();
    const result = await h.reader.browseShort({ first: 3, viewerId: 'viewer' });
    expect(result.items.map(({ id }) => id)).toEqual(['article']);
    expect(result.pinnedItems.map(({ id }) => id)).toEqual(['pin']);
    expect(result.hasNextPage).toBe(true);
    expect(result.items[0]).not.toHaveProperty('authorId');
    expect(h.profiles.read).toHaveBeenCalledTimes(1);
    expect(h.interactions.summaries).toHaveBeenCalledWith(
      h.client,
      ['target', 'target'],
      'viewer',
    );
    const numbered = await h.reader.browseShortNumbered({
      page: 2,
      pageSize: 3,
    });
    expect(numbered).toMatchObject({
      page: 2,
      pageSize: 3,
      total: 4,
      totalPages: 2,
    });
  });
  it('returns full owned fields/shares without exposing raw author identity fields', async () => {
    const h = harness();
    const full = await h.reader.findFullBySlug('uk', 'article');
    expect(full).toMatchObject({
      documentJson: '{}',
      templateDataJson: '{}',
      allowComments: true,
      related: [],
      sharing: { total: 0 },
    });
    expect(full).not.toHaveProperty('authorId');
  });
  it('strips vote actorId and display-only avatarMediaId from actor shape', async () => {
    const h = harness();
    const result = await h.reader.ratingVotes('article', 2, 3);
    expect(result.items[0]).not.toHaveProperty('actorId');
    expect(result.items[0].actor).toEqual({
      id: 'author',
      username: 'pilot',
      displayName: null,
      avatarUrl: null,
    });
  });
  it('composes comment/reply display without changing the owner tree or paging', async () => {
    const h = harness();
    const result = await h.reader.comments('article', 2, 3);
    expect(result).toMatchObject({
      page: 2,
      pageSize: 3,
      total: 4,
      totalPages: 2,
    });
    expect(result.items[0].children[0]).toMatchObject({
      id: 'reply',
      parentId: 'comment',
      body: 'Body',
      author: { id: 'author' },
    });
    expect(result.items[0]).not.toHaveProperty('authorId');
  });
  it('short-circuits missing full articles and unavailable secondary projections', async () => {
    const h = harness();
    h.news.findFullBySlug.mockResolvedValue(null);
    h.news.eligibleTarget.mockResolvedValue(null);
    expect(await h.reader.findFullBySlug('uk', 'missing')).toBeNull();
    for (const result of [
      await h.reader.comments('missing', 2, 3),
      await h.reader.ratingVotes('missing', 2, 3),
    ])
      expect(result).toEqual({
        items: [],
        total: 0,
        page: 2,
        pageSize: 3,
        totalPages: 0,
      });
    expect(h.profiles.read).not.toHaveBeenCalled();
    for (const mock of Object.values(h.interactions))
      expect(mock).not.toHaveBeenCalled();
  });
  it('skips owner hydration for empty browse results', async () => {
    const h = harness();
    h.news.browseShort.mockResolvedValue({
      items: [],
      pinnedItems: [],
      hasNextPage: false,
    });
    await h.reader.browseShort({ first: 3 });
    expect(h.profiles.read).not.toHaveBeenCalled();
    expect(h.interactions.summaries).not.toHaveBeenCalled();
  });
  it.each(['profile', 'interaction'] as const)(
    'rejects incomplete %s evidence instead of defaults',
    async (owner) => {
      const h = harness();
      (owner === 'profile'
        ? h.profiles.read
        : h.interactions.summaries
      ).mockResolvedValue(new Map());
      await expect(h.reader.browseShort({ first: 3 })).rejects.toThrow(
        'owner evidence is incomplete',
      );
    },
  );
  it.each(['votes', 'comments'] as const)(
    'rejects missing actor evidence for %s',
    async (operation) => {
      const h = harness();
      h.profiles.read.mockResolvedValue(new Map());
      await expect(
        operation === 'votes'
          ? h.reader.ratingVotes('article', 1, 3)
          : h.reader.comments('article', 1, 3),
      ).rejects.toThrow('actor evidence is incomplete');
    },
  );
});
