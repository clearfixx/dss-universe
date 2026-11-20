/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Search Tests
 * 📄 File: apps/api/src/modules/news/infrastructure/repositories/prisma-news-search.session.spec.ts
 *
 * 🎯 Purpose:
 * Protects fail-closed search coordination and bounded projection scheduling.
 *
 * 🧠 Responsibilities:
 * • checks snapshot options, readiness, transaction-local selection and cleanup on errors;
 * • verifies batch traversal, concurrency bounds and draining failed projection chunks.
 *
 * 🏗️ Architecture:
 * Private persistence unit tests; migrated E2E proves actual SQL and policy behavior.
 *
 * ⚠️ Important:
 * Mocked match rows do not certify database substring or viewer eligibility semantics.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import type { NewsSearchBatchProjector } from '../../domain/ports/news-search-batch-projector.interface';
import { PrismaNewsSearchSession } from './prisma-news-search.session';

function harness() {
  const state = {
    gaps: [] as { id: string }[],
    pins: [] as { id: string }[],
    page: [] as { id: string }[],
    sharedItems: [] as Array<{
      id: string;
      title: string;
      language: string;
      slug: string;
      excerpt: string;
      publishedAt: Date;
    }>,
    categories: [] as { slug: string; total: number }[],
    total: 0,
    batches: [] as { id: string; documentJson: string }[][],
  };
  const query = jest
    .fn<Promise<unknown>, [Prisma.Sql]>()
    .mockImplementation((sql) => {
      const text = Array.isArray(sql)
        ? (sql as unknown as readonly string[]).join('?')
        : sql.text;
      if (text.includes('LEFT JOIN')) return Promise.resolve(state.gaps);
      if (text.includes('AS "documentJson"'))
        return Promise.resolve(state.batches.shift() ?? []);
      if (text.includes('JOIN "news_pins"')) return Promise.resolve(state.pins);
      if (text.toUpperCase().includes('COUNT(*)'))
        return Promise.resolve([{ total: state.total }]);
      if (text.includes('GROUP BY c.slug'))
        return Promise.resolve(state.categories);
      if (text.includes('left(a."shortText",240)'))
        return Promise.resolve(state.sharedItems);
      return Promise.resolve(state.page);
    });
  const execute = jest.fn<Promise<number>, [Prisma.Sql]>().mockResolvedValue(1);
  const client = {
    $queryRaw: query,
    $executeRaw: execute,
  } as unknown as Prisma.TransactionClient;
  const transaction = jest
    .fn<
      Promise<unknown>,
      [(tx: Prisma.TransactionClient) => Promise<unknown>, unknown]
    >()
    .mockImplementation((callback) => callback(client));
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  const project = jest
    .fn<
      ReturnType<NewsSearchBatchProjector['project']>,
      Parameters<NewsSearchBatchProjector['project']>
    >()
    .mockResolvedValue([]);
  const projector: NewsSearchBatchProjector = {
    project,
  };
  const session = new PrismaNewsSearchSession(prisma, projector);
  return { session, state, query, execute, transaction, project, client };
}

describe('PrismaNewsSearchSession', () => {
  it('rejects missing search in the root-supplied transaction before SQL', async () => {
    const h = harness();
    await expect(h.session.select(h.client, { first: 10 })).rejects.toThrow(
      'requires a search expression',
    );
    expect(h.query).not.toHaveBeenCalled();
    expect(h.execute).not.toHaveBeenCalled();
    expect(h.transaction).not.toHaveBeenCalled();
  });

  it('rejects missing search before opening a database snapshot', () => {
    const h = harness();
    expect(() =>
      h.session.run({ first: 10 }, () => Promise.resolve(null)),
    ).toThrow('requires a search expression');
    expect(h.transaction).not.toHaveBeenCalled();
  });

  it('returns literal shared hits, totals and facets from one repeatable snapshot', async () => {
    const h = harness();
    const publishedAt = new Date('2026-11-18T00:00:00Z');
    h.state.total = 3;
    h.state.sharedItems = [
      {
        id: 'news-1',
        title: 'Literal marker',
        language: 'uk',
        slug: 'literal-marker',
        excerpt: 'Visible excerpt',
        publishedAt,
      },
    ];
    h.state.categories = [{ slug: 'platform', total: 3 }];

    await expect(
      h.session.searchArticles({
        term: '  10%_UA\\marker  ',
        page: 2,
        pageSize: 1,
        viewerId: 'viewer',
      }),
    ).resolves.toEqual({
      items: h.state.sharedItems,
      total: 3,
      categories: h.state.categories,
    });
    expect(h.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    expect(h.execute.mock.calls[1][0].values).toContain('10\\%\\_UA\\\\marker');
    expect(
      h.query.mock.calls
        .find(([sql]) =>
          (Array.isArray(sql)
            ? (sql as unknown as readonly string[]).join('?')
            : sql.text
          ).includes('left(a."shortText",240)'),
        )!
        .slice(-2),
    ).toEqual([1, 1]);
  });

  it.each([
    { term: ' ', page: 1, pageSize: 20 },
    { term: 'x'.repeat(101), page: 1, pageSize: 20 },
    { term: 'x', page: 0, pageSize: 20 },
    { term: 'x', page: 1.5, pageSize: 20 },
    { term: 'x', page: 1, pageSize: 0 },
    { term: 'x', page: 1, pageSize: 51 },
    { term: 'x', page: 1, pageSize: 1.5 },
    { term: 'x', page: Number.MAX_SAFE_INTEGER, pageSize: 50 },
  ])('rejects invalid shared query %# before SQL', async (query) => {
    const h = harness();
    await expect(h.session.searchArticles(query)).rejects.toThrow(
      'Invalid search query.',
    );
    expect(h.transaction).not.toHaveBeenCalled();
  });

  it('rejects stale/missing evidence before constructing matches or invoking the reader', async () => {
    const h = harness();
    h.state.gaps = [{ id: 'missing' }];
    const read = jest.fn<Promise<null>, []>().mockResolvedValue(null);
    await expect(
      h.session.run({ first: 10, search: 'secret' }, read),
    ).rejects.toThrow('requires maintenance');
    expect(h.execute).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
    expect(h.project).not.toHaveBeenCalled();
  });

  it('reads guest pins/items from the same repeatable snapshot without viewer projection', async () => {
    const h = harness();
    h.state.pins = [{ id: 'pin' }];
    h.state.page = [{ id: 'one' }, { id: 'two' }, { id: 'sentinel' }];
    h.state.total = 7;
    const result = await h.session.run(
      { first: 2, search: 'a\\_b' },
      (tx, selection) => {
        expect(tx).toBe(h.client);
        return Promise.resolve(selection);
      },
    );
    expect(result).toEqual({
      itemIds: ['one', 'two'],
      pinnedIds: ['pin'],
      total: 7,
      hasNextPage: true,
    });
    expect(h.transaction.mock.calls[0][1]).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    expect(h.project).not.toHaveBeenCalled();
    expect(h.execute.mock.calls[0][0].text).toContain('ON COMMIT DROP');
    expect(h.execute.mock.calls[1][0].values).toContain('a\\_b');
    expect(h.query.mock.calls.at(-1)![0].values).toContain('pin');
  });

  it('selects numbered offsets and category pins without cursor or sentinel semantics', async () => {
    const h = harness();
    h.state.page = [{ id: 'one' }];
    await expect(
      h.session.run(
        { page: 4, pageSize: 3, categorySlug: 'science', search: 'body' },
        (_tx, selection) => Promise.resolve(selection),
      ),
    ).resolves.toMatchObject({ itemIds: ['one'], hasNextPage: false });
    expect(h.query.mock.calls.at(-1)![0].values.slice(-2)).toEqual([3, 9]);
    expect(
      h.query.mock.calls.find(([sql]) =>
        sql.text.includes('JOIN "news_pins"'),
      )![0].values,
    ).toContain('science');
  });

  it('retains the exact cursor date/id predicates and reads only first plus one', async () => {
    const h = harness();
    const date = new Date('2026-10-14T00:00:00Z');
    await h.session.run(
      { first: 3, cursor: { publishedAt: date, id: 'cursor' }, search: 'body' },
      () => Promise.resolve(null),
    );
    expect(h.query.mock.calls.at(-1)![0].values).toEqual([
      date,
      date,
      'cursor',
      4,
      0,
    ]);
  });

  it('traverses complete gated batches of at most 64 without a corpus cap', async () => {
    const h = harness();
    const sources = Array.from({ length: 65 }, (_, index) => ({
      id: 'source-' + index,
      documentJson: 'canonical-' + index,
    }));
    h.state.batches = [sources.slice(0, 64), sources.slice(64)];
    h.project.mockImplementation((documents) =>
      Promise.resolve(documents.map(() => ({ searchText: 'viewer body' }))),
    );
    await h.session.run({ first: 2, search: 'body', viewerId: 'viewer' }, () =>
      Promise.resolve(null),
    );
    expect(h.project).toHaveBeenCalledTimes(2);
    expect(h.project.mock.calls.map(([documents]) => documents.length)).toEqual(
      [64, 1],
    );
    expect(h.project).toHaveBeenLastCalledWith(['canonical-64'], 'viewer');
    const inserts = h.execute.mock.calls
      .map(([sql]) => sql)
      .filter((sql) => sql.text.includes('FROM (VALUES'));
    expect(inserts.map((sql) => sql.values.length)).toEqual([129, 3]);
    const scans = h.query.mock.calls
      .map(([sql]) => sql)
      .filter((sql) => sql.text.includes('AS "documentJson"'));
    expect(scans).toHaveLength(3);
    expect(scans.every((sql) => sql.values.at(-1) === 64)).toBe(true);
    expect(scans[1].values).toContain('source-63');
  });

  it.each(['failure', 'partial'])(
    'rejects %s batch evidence without private diagnostics or partial reader output',
    async (kind) => {
      const h = harness();
      h.state.batches = [
        [
          { id: 'one', documentJson: 'one' },
          { id: 'two', documentJson: 'two' },
        ],
      ];
      if (kind === 'failure')
        h.project.mockRejectedValue(new Error('synthetic-private-diagnostic'));
      else h.project.mockResolvedValue([{ searchText: 'only one' }]);
      const read = jest.fn<Promise<null>, []>().mockResolvedValue(null);
      await expect(
        h.session.run({ first: 10, search: 'body', viewerId: 'viewer' }, read),
      ).rejects.toEqual(new Error('News search projection is unavailable.'));
      expect(read).not.toHaveBeenCalled();
      expect(h.execute).toHaveBeenCalledTimes(2);
    },
  );

  it('propagates persistence failures rather than returning a partially counted page', async () => {
    const h = harness();
    h.execute.mockRejectedValue(new Error('Synthetic database failure'));
    const read = jest.fn<Promise<null>, []>().mockResolvedValue(null);
    await expect(
      h.session.run({ first: 1, search: 'body' }, read),
    ).rejects.toThrow('Synthetic database failure');
    expect(read).not.toHaveBeenCalled();
  });
});
