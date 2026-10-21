/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Composition Tests
 * 📄 File: apps/api/src/composition/reputation/infrastructure/prisma-reputation.read-unit.spec.ts
 *
 * 🎯 Purpose:
 * Pins explicit read-client composition, owner query surfaces and failure propagation.
 *
 * 🧠 Responsibilities:
 * • verifies legacy read ordering and independent original lookups;
 * • rejects incomplete actor evidence and over-broad public projections;
 * • checks owned selectors never query foreign tables or invent eligibility policy.
 *
 * 🏗️ Architecture:
 * Pure adapter tests; migrated E2E separately verifies SQL, isolation and rollback.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@api/core/database';
import { PrismaReputationEntryReader } from '@api/modules/reputation/infrastructure';
import { PrismaReputationActorReader } from '@api/modules/users/infrastructure';
import { PrismaReputationReadUnit } from './prisma-reputation.read-unit';

function harness() {
  const client = {} as Prisma.TransactionClient;
  const transaction = jest
    .fn<
      Promise<unknown>,
      [(client: Prisma.TransactionClient) => Promise<unknown>]
    >()
    .mockImplementation((read) => read(client));
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  const fact = {
    id: 'original',
    actorId: 'actor',
    recipientId: 'recipient',
    value: 1,
    reason: 'Reason',
    createdAt: new Date(0),
  };
  const reversed = {
    id: 'reversal',
    actorId: 'moderator',
    reversesEntryId: 'original',
    reason: 'Correction',
    createdAt: new Date(1),
  };
  const profile = {
    id: 'actor',
    username: 'pilot',
    displayName: null,
    avatarUrl: null,
  };
  const moderator = { ...profile, id: 'moderator', username: 'moderator' };
  const entries = {
    page: jest.fn().mockResolvedValue([fact]),
    original: jest.fn().mockResolvedValue(fact),
    reversals: jest.fn().mockResolvedValue([reversed]),
    total: jest.fn().mockResolvedValue(1),
    score: jest.fn().mockResolvedValue(0),
  };
  const actors = {
    read: jest.fn().mockResolvedValue(
      new Map([
        ['actor', profile],
        ['moderator', moderator],
      ]),
    ),
  };
  const unit = new PrismaReputationReadUnit(prisma, entries, actors);
  return {
    client,
    transaction,
    prisma,
    entries,
    actors,
    unit,
    fact,
    reversed,
    profile,
    moderator,
  };
}

describe('Reputation read composition', () => {
  it('retains sequential query scheduling on one explicit default-isolation history client', async () => {
    const h = harness();
    expect(await h.unit.history('recipient', 2, 3)).toEqual({
      items: [
        {
          id: h.fact.id,
          recipientId: 'recipient',
          value: 1,
          reason: 'Reason',
          createdAt: h.fact.createdAt,
          actor: h.profile,
          reversal: {
            id: h.reversed.id,
            reason: 'Correction',
            createdAt: h.reversed.createdAt,
            actor: h.moderator,
          },
        },
      ],
      total: 1,
      score: 0,
      page: 2,
      limit: 3,
      totalPages: 1,
    });
    expect(h.transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(h.entries.page).toHaveBeenCalledWith(h.client, 'recipient', 2, 3);
    expect(h.actors.read.mock.calls).toEqual([
      [h.client, ['actor']],
      [h.client, ['moderator']],
    ]);
    expect(h.entries.reversals).toHaveBeenCalledWith(h.client, ['original']);
    expect(h.entries.total).toHaveBeenCalledWith(h.client, 'recipient');
    expect(h.entries.score).toHaveBeenCalledWith(h.client, 'recipient');
    const order = [
      h.entries.page.mock.invocationCallOrder[0],
      h.actors.read.mock.invocationCallOrder[0],
      h.entries.reversals.mock.invocationCallOrder[0],
      h.actors.read.mock.invocationCallOrder[1],
      h.entries.total.mock.invocationCallOrder[0],
      h.entries.score.mock.invocationCallOrder[0],
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it('skips all relation reads for an empty page while retaining authoritative count and signed score', async () => {
    const h = harness();
    h.entries.page.mockResolvedValue([]);
    h.entries.total.mockResolvedValue(8);
    h.entries.score.mockResolvedValue(-2);
    expect(await h.unit.history('recipient', 9, 2)).toEqual({
      items: [],
      total: 8,
      score: -2,
      page: 9,
      limit: 2,
      totalPages: 4,
    });
    expect(h.actors.read).not.toHaveBeenCalled();
    expect(h.entries.reversals).not.toHaveBeenCalled();
  });
  it('preserves no-reversal null shape and copies only the four public actor fields', async () => {
    const h = harness();
    h.entries.reversals.mockResolvedValue([]);
    h.actors.read.mockResolvedValue(
      new Map([
        ['actor', { ...h.profile, email: 'synthetic-private@example.test' }],
      ]),
    );
    const page = await h.unit.history('recipient', 1, 20);
    expect(page.items[0].actor).toEqual(h.profile);
    expect(page.items[0].reversal).toBeNull();
    expect(page.items[0]).not.toHaveProperty('actorId');
  });
  it('retains independent original-entry reads without opening a new transaction', async () => {
    const h = harness();
    expect(await h.unit.findOriginalById('original')).toMatchObject({
      id: 'original',
      actor: h.profile,
    });
    expect(h.entries.original).toHaveBeenCalledWith(h.prisma, 'original');
    expect(h.transaction).not.toHaveBeenCalled();
    expect(
      h.actors.read.mock.calls.every(([client]) => client === h.prisma),
    ).toBe(true);
  });
  it('short-circuits absent original entries without profile or reversal reads', async () => {
    const h = harness();
    h.entries.original.mockResolvedValue(null);
    expect(await h.unit.findOriginalById('absent')).toBeNull();
    expect(h.actors.read).not.toHaveBeenCalled();
    expect(h.entries.reversals).not.toHaveBeenCalled();
  });
  it.each(['original', 'reversal'] as const)(
    'fails closed on missing %s actor evidence',
    async (kind) => {
      const h = harness();
      h.actors.read.mockResolvedValue(
        new Map(
          kind === 'original'
            ? [['moderator', h.moderator]]
            : [['actor', h.profile]],
        ),
      );
      await expect(h.unit.history('recipient', 1, 20)).rejects.toThrow(
        'Reputation actor evidence is incomplete.',
      );
      expect(h.entries.total).not.toHaveBeenCalled();
    },
  );
  it.each(['page', 'reversals', 'total', 'score'] as const)(
    'propagates %s owner failure without a synthetic page',
    async (stage) => {
      const h = harness();
      const failure = new Error('Synthetic owner failure');
      h.entries[stage].mockRejectedValue(failure);
      await expect(h.unit.history('recipient', 1, 20)).rejects.toBe(failure);
    },
  );
  it.each([1, 2])('propagates actor batch %s failure', async (batch) => {
    const h = harness();
    const failure = new Error('Synthetic display failure');
    if (batch === 2)
      h.actors.read.mockResolvedValueOnce(new Map([['actor', h.profile]]));
    h.actors.read.mockRejectedValueOnce(failure);
    await expect(h.unit.history('recipient', 1, 20)).rejects.toBe(failure);
  });
  it('propagates independent original-provider failure', async () => {
    const h = harness();
    const failure = new Error('Synthetic original failure');
    h.entries.original.mockRejectedValue(failure);
    await expect(h.unit.findOriginalById('original')).rejects.toBe(failure);
  });
});

describe('Owned technical ledger selectors', () => {
  function harnessStore() {
    const store = new PrismaReputationEntryReader();
    const delegate = {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: { value: null } }),
    };
    const client = {
      reputationEntry: delegate,
    } as unknown as Prisma.TransactionClient;
    return { store, delegate, client };
  }
  it('reads only ledger scalar facts in the original order and numbered page', async () => {
    const h = harnessStore();
    await h.store.page(h.client, 'recipient', 3, 2);
    expect(h.delegate.findMany).toHaveBeenCalledWith({
      where: { recipientId: 'recipient', reversesEntryId: null },
      select: {
        id: true,
        actorId: true,
        recipientId: true,
        value: true,
        reason: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 4,
      take: 2,
    });
  });
  it('filters compensation IDs out of original lookup', async () => {
    const h = harnessStore();
    await h.store.original(h.client, 'entry');
    expect(h.delegate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'entry', reversesEntryId: null },
      }),
    );
  });
  it('skips empty reversal lists and selects only owned compensation fields', async () => {
    const h = harnessStore();
    expect(await h.store.reversals(h.client, [])).toEqual([]);
    expect(h.delegate.findMany).not.toHaveBeenCalled();
    await h.store.reversals(h.client, ['original']);
    expect(h.delegate.findMany).toHaveBeenCalledWith({
      where: { reversesEntryId: { in: ['original'] } },
      select: {
        id: true,
        actorId: true,
        reversesEntryId: true,
        reason: true,
        createdAt: true,
      },
    });
  });
  it('counts originals but sums every signed ledger entry, including zero fallback', async () => {
    const h = harnessStore();
    await h.store.total(h.client, 'recipient');
    expect(h.delegate.count).toHaveBeenCalledWith({
      where: { recipientId: 'recipient', reversesEntryId: null },
    });
    expect(await h.store.score(h.client, 'recipient')).toBe(0);
    h.delegate.aggregate.mockResolvedValue({ _sum: { value: -3 } });
    expect(await h.store.score(h.client, 'recipient')).toBe(-3);
    expect(h.delegate.aggregate).toHaveBeenCalledWith({
      where: { recipientId: 'recipient' },
      _sum: { value: true },
    });
  });
});

describe('Users-owned reputation actor selector', () => {
  it('skips empty IDs, deduplicates batches and selects exactly public display without eligibility policy', async () => {
    const reader = new PrismaReputationActorReader();
    const row = {
      id: 'actor',
      username: 'pilot',
      displayName: null,
      avatarUrl: null,
    };
    const findMany = jest.fn().mockResolvedValue([row]);
    const client = {
      user: { findMany },
    } as unknown as Prisma.TransactionClient;
    expect(await reader.read(client, [])).toEqual(new Map());
    expect(findMany).not.toHaveBeenCalled();
    expect(await reader.read(client, ['actor', 'actor'])).toEqual(
      new Map([['actor', row]]),
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: ['actor'] } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
  });
});
