/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Write Composition Tests
 * 📄 File: apps/api/src/composition/reputation/infrastructure/reputation-write-boundaries.spec.ts
 *
 * 🎯 Purpose:
 * Pins owned write decisions, same-client projection and pre-evidence failure ordering.
 *
 * 🧠 Responsibilities:
 * • verifies strict cooldown/reversal short-circuits and owned SQL surfaces;
 * • verifies default root transaction options and both actor lookup stages;
 * • keeps policy persistence separate from semantic entry delegation.
 *
 * 🏗️ Architecture:
 * Pure adapter tests; migrated E2E separately proves locks, rollback and authorization compatibility.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';
import type {
  CreateReputationEntry,
  ReputationEntry,
} from '@api/modules/reputation';
import {
  PrismaReputationWriter,
  type ReputationEntryProjection,
  type ReputationEntryFact,
  type PrismaReputationEntryReader,
} from '@api/modules/reputation/infrastructure';
import { PrismaReputationWriteActorReader } from '@api/modules/users/infrastructure';
import { PrismaReputationWriteTransaction } from './prisma-reputation-write.transaction';
import { PrismaReputationRepository } from '../../../modules/reputation/infrastructure/repositories/prisma-reputation.repository';

const fact: ReputationEntryFact = {
  id: 'entry',
  actorId: 'actor',
  recipientId: 'recipient',
  value: 1,
  reason: 'Reason',
  createdAt: new Date(0),
};
const profile = {
  id: 'actor',
  username: 'pilot',
  displayName: null,
  avatarUrl: null,
};
const response: ReputationEntry = {
  id: fact.id,
  actor: profile,
  recipientId: fact.recipientId,
  value: 1,
  reason: fact.reason,
  createdAt: fact.createdAt,
  reversal: null,
};
const input: CreateReputationEntry = {
  actorId: 'actor',
  recipientId: 'recipient',
  value: 1,
  reason: 'Reason',
  cooldownStartedAfter: new Date(0),
};

describe('Owned Reputation writer', () => {
  function harness() {
    const delegate = {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(fact),
    };
    const lock = jest.fn().mockResolvedValue(1);
    const transaction = {
      reputationEntry: delegate,
      $executeRaw: lock,
    } as unknown as Prisma.TransactionClient;
    const audit = jest.fn().mockResolvedValue('audit');
    const outbox = jest.fn().mockResolvedValue('outbox');
    const project = jest
      .fn<Promise<ReputationEntry>, [ReputationEntryFact]>()
      .mockResolvedValue(response);
    const writer = new PrismaReputationWriter(
      { append: audit } as unknown as AuditWriterService,
      { append: outbox },
    );
    return { delegate, lock, transaction, audit, outbox, project, writer };
  }
  it('locks the pair, uses strict cooldown and projects owned scalar INSERT before evidence', async () => {
    const h = harness();
    expect(
      await h.writer.createDirect(h.transaction, input, h.project),
    ).toEqual(response);
    expect(h.lock).toHaveBeenCalledWith(
      expect.any(Array),
      'reputation:actor:recipient',
    );
    expect(h.delegate.findFirst).toHaveBeenCalledWith({
      where: {
        actorId: 'actor',
        recipientId: 'recipient',
        reversesEntryId: null,
        createdAt: { gt: input.cooldownStartedAfter },
      },
      select: { id: true },
    });
    expect(h.delegate.create).toHaveBeenCalledWith({
      data: {
        actorId: 'actor',
        recipientId: 'recipient',
        value: 1,
        reason: 'Reason',
      },
      select: {
        id: true,
        actorId: true,
        recipientId: true,
        value: true,
        reason: true,
        createdAt: true,
      },
    });
    expect(h.project).toHaveBeenCalledWith(fact);
    const order = [
      h.lock.mock.invocationCallOrder[0],
      h.delegate.findFirst.mock.invocationCallOrder[0],
      h.delegate.create.mock.invocationCallOrder[0],
      h.project.mock.invocationCallOrder[0],
      h.audit.mock.invocationCallOrder[0],
      h.outbox.mock.invocationCallOrder[0],
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(h.audit).toHaveBeenCalledWith(
      h.transaction,
      expect.objectContaining({
        action: 'reputation.direct.changed',
        actorId: 'actor',
        reason: 'Reason',
        metadata: { recipientId: 'recipient', value: 1 },
      }),
    );
  });
  it('returns null for a recent original without INSERT, display lookup or evidence', async () => {
    const h = harness();
    h.delegate.findFirst.mockResolvedValue({ id: 'recent' });
    expect(
      await h.writer.createDirect(h.transaction, input, h.project),
    ).toBeNull();
    for (const call of [h.delegate.create, h.project, h.audit, h.outbox])
      expect(call).not.toHaveBeenCalled();
  });
  it('retains reversal lock/unique check and compensation payload without foreign relations', async () => {
    const h = harness();
    await h.writer.reverse(
      h.transaction,
      'original',
      'moderator',
      'recipient',
      -1,
      'Correction',
      h.project,
    );
    expect(h.lock).toHaveBeenCalledWith(
      expect.any(Array),
      'reputation-reversal:original',
    );
    expect(h.delegate.findUnique).toHaveBeenCalledWith({
      where: { reversesEntryId: 'original' },
      select: { id: true },
    });
    expect(h.delegate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          actorId: 'moderator',
          recipientId: 'recipient',
          value: -1,
          reason: 'Correction',
          reversesEntryId: 'original',
        },
      }),
    );
    expect(h.outbox).toHaveBeenCalledWith(
      h.transaction,
      expect.objectContaining({
        name: 'reputation.direct.reversed.v1',
        producer: 'dss.api.reputation',
        actorId: 'moderator',
        payload: {
          recipientId: 'recipient',
          value: -1,
          reversesEntryId: 'original',
        },
      }),
    );
  });
  it('returns null for an existing compensation without projection or evidence', async () => {
    const h = harness();
    h.delegate.findUnique.mockResolvedValue({ id: 'compensation' });
    expect(
      await h.writer.reverse(
        h.transaction,
        'original',
        'moderator',
        'recipient',
        -1,
        'Correction',
        h.project,
      ),
    ).toBeNull();
    for (const call of [h.delegate.create, h.project, h.audit, h.outbox])
      expect(call).not.toHaveBeenCalled();
  });
  it.each(['projection', 'audit', 'outbox'] as const)(
    'propagates %s failure without swallowing the transaction error',
    async (stage) => {
      const h = harness();
      const failure = new Error('Synthetic write failure');
      if (stage === 'projection') h.project.mockRejectedValue(failure);
      else h[stage].mockRejectedValue(failure);
      await expect(
        h.writer.createDirect(h.transaction, input, h.project),
      ).rejects.toBe(failure);
      if (stage === 'projection') expect(h.audit).not.toHaveBeenCalled();
    },
  );
});

describe('Root Reputation write transaction', () => {
  function harness() {
    const client = {} as Prisma.TransactionClient;
    const transaction = jest
      .fn<
        Promise<unknown>,
        [(tx: Prisma.TransactionClient) => Promise<unknown>]
      >()
      .mockImplementation((operation) => operation(client));
    const createDirect = jest
      .fn<
        Promise<ReputationEntry>,
        [
          Prisma.TransactionClient,
          CreateReputationEntry,
          ReputationEntryProjection,
        ]
      >()
      .mockImplementation((_tx, _input, project) => project(fact));
    const reverse = jest
      .fn<
        Promise<ReputationEntry>,
        [
          Prisma.TransactionClient,
          string,
          string,
          string,
          -1 | 1,
          string,
          ReputationEntryProjection,
        ]
      >()
      .mockImplementation(
        (_tx, _id, _actor, _recipient, _value, _reason, project) =>
          project(fact),
      );
    const entries = { reversals: jest.fn().mockResolvedValue([]) };
    const actors = {
      read: jest
        .fn()
        .mockResolvedValue(
          new Map([
            ['actor', { ...profile, email: 'synthetic-private@example.test' }],
          ]),
        ),
    };
    const unit = new PrismaReputationWriteTransaction(
      { $transaction: transaction } as unknown as PrismaService,
      { createDirect, reverse } as unknown as PrismaReputationWriter,
      entries as unknown as PrismaReputationEntryReader,
      actors,
    );
    return {
      client,
      transaction,
      createDirect,
      reverse,
      entries,
      actors,
      unit,
    };
  }
  it('binds the same default-isolation client and both actor stages to create', async () => {
    const h = harness();
    expect(await h.unit.createDirect(input)).toEqual(response);
    expect(h.transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(h.createDirect).toHaveBeenCalledWith(
      h.client,
      input,
      expect.any(Function),
    );
    expect(h.actors.read.mock.calls).toEqual([
      [h.client, ['actor']],
      [h.client, []],
    ]);
    expect(h.entries.reversals).toHaveBeenCalledWith(h.client, ['entry']);
    expect(h.entries.reversals.mock.invocationCallOrder[0]).toBeGreaterThan(
      h.actors.read.mock.invocationCallOrder[0],
    );
    expect(h.entries.reversals.mock.invocationCallOrder[0]).toBeLessThan(
      h.actors.read.mock.invocationCallOrder[1],
    );
  });
  it('binds the same projection client to reverse without opening a second transaction', async () => {
    const h = harness();
    expect(
      await h.unit.reverse(
        'original',
        'moderator',
        'recipient',
        -1,
        'Correction',
      ),
    ).toEqual(response);
    expect(h.reverse).toHaveBeenCalledWith(
      h.client,
      'original',
      'moderator',
      'recipient',
      -1,
      'Correction',
      expect.any(Function),
    );
    expect(h.transaction).toHaveBeenCalledTimes(1);
    expect(h.transaction).toHaveBeenCalledWith(expect.any(Function));
  });
  it('composes a present compensation through the same four-field mapper', async () => {
    const h = harness();
    h.entries.reversals.mockResolvedValue([
      {
        id: 'reversed',
        actorId: 'actor',
        reversesEntryId: 'entry',
        reason: 'Correction',
        createdAt: new Date(1),
      },
    ]);
    expect(await h.unit.createDirect(input)).toMatchObject({
      reversal: { id: 'reversed', actor: profile },
    });
  });
  it('associates compensation by original ID rather than taking an unrelated first row', async () => {
    const h = harness();
    h.entries.reversals.mockResolvedValue([
      {
        id: 'unrelated',
        actorId: 'actor',
        reversesEntryId: 'another-entry',
        reason: 'Correction',
        createdAt: new Date(1),
      },
    ]);
    expect(await h.unit.createDirect(input)).toMatchObject({ reversal: null });
  });
  it.each(['first-actor', 'second-actor', 'reversals'] as const)(
    'propagates %s provider failure',
    async (stage) => {
      const h = harness();
      const failure = new Error('Synthetic owner failure');
      if (stage === 'reversals') h.entries.reversals.mockRejectedValue(failure);
      else {
        if (stage === 'second-actor')
          h.actors.read.mockResolvedValueOnce(new Map([['actor', profile]]));
        h.actors.read.mockRejectedValueOnce(failure);
      }
      await expect(h.unit.createDirect(input)).rejects.toBe(failure);
    },
  );
  it.each(['createDirect', 'reverse'] as const)(
    'propagates owned %s failure',
    async (kind) => {
      const h = harness();
      const failure = new Error('Synthetic ledger failure');
      h[kind].mockRejectedValue(failure);
      await expect(
        kind === 'createDirect'
          ? h.unit.createDirect(input)
          : h.unit.reverse(
              'original',
              'moderator',
              'recipient',
              -1,
              'Correction',
            ),
      ).rejects.toBe(failure);
    },
  );
});

describe('Users write actor projection', () => {
  it('retains a real empty lookup stage, fixed projection and ID deduplication without status policy', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const client = {
      user: { findMany },
    } as unknown as Prisma.TransactionClient;
    const reader = new PrismaReputationWriteActorReader();
    expect(await reader.read(client, [])).toEqual(new Map());
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: [] } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    findMany.mockResolvedValue([profile]);
    expect(await reader.read(client, ['actor', 'actor'])).toEqual(
      new Map([['actor', profile]]),
    );
    expect(findMany).toHaveBeenLastCalledWith({
      where: { id: { in: ['actor'] } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
  });
});

describe('Owned policy persistence and semantic delegation', () => {
  it('keeps policy upsert/audit local and delegates all entry reads/writes without foreign SQL', async () => {
    const policy = {
      minimumAccountAgeDays: 0,
      updatedById: null,
      updatedAt: new Date(0),
    };
    const upsert = jest.fn().mockResolvedValue(policy);
    const client = {
      reputationPolicy: { upsert },
    } as unknown as Prisma.TransactionClient;
    const transaction = jest
      .fn<
        Promise<unknown>,
        [(client: Prisma.TransactionClient) => Promise<unknown>]
      >()
      .mockImplementation((operation) => operation(client));
    const audit = jest.fn().mockResolvedValue('audit');
    const writes = {
      createDirect: jest.fn().mockResolvedValue(response),
      reverse: jest.fn().mockResolvedValue(response),
    };
    const reads = {
      findOriginalById: jest.fn().mockResolvedValue(response),
      history: jest.fn().mockResolvedValue({ items: [response] }),
    };
    const repository = new PrismaReputationRepository(
      {
        reputationPolicy: { upsert },
        $transaction: transaction,
      } as unknown as PrismaService,
      { append: audit } as unknown as AuditWriterService,
      writes,
      reads,
    );
    expect(await repository.policy()).toEqual(policy);
    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
    await repository.updatePolicy(4, 'owner');
    expect(audit).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        action: 'reputation.policy.updated',
        actorId: 'owner',
        metadata: { minimumAccountAgeDays: 4 },
      }),
    );
    transaction.mockClear();
    await repository.createDirect(input);
    await repository.reverse(
      'original',
      'moderator',
      'recipient',
      -1,
      'Correction',
    );
    await repository.findOriginalById('original');
    await repository.history('recipient', 2, 3);
    expect(writes.createDirect).toHaveBeenCalledWith(input);
    expect(writes.reverse).toHaveBeenCalledWith(
      'original',
      'moderator',
      'recipient',
      -1,
      'Correction',
    );
    expect(reads.findOriginalById).toHaveBeenCalledWith('original');
    expect(reads.history).toHaveBeenCalledWith('recipient', 2, 3);
    expect(transaction).not.toHaveBeenCalled();
  });
});
