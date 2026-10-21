/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Write Boundary E2E
 * 📄 File: apps/api/test/reputation-write-ownership.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Pins atomic direct/compensating ledger responses before and after actor SQL ownership transfer.
 *
 * 🧠 Responsibilities:
 * • checks query order, projection, cooldown boundaries and real advisory-lock concurrency;
 * • throws after genuine audit/outbox writes to prove unchanged persisted state;
 * • keeps immutable ledger triggers and application eligibility ownership intact.
 *
 * 🏗️ Architecture:
 * Actual AppModule in an owned migrated schema; no successful authorization mocks or sleeps.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import {
  REPUTATION_REPOSITORY,
  type ReputationRepository,
} from '../src/modules/reputation/domain/repositories/reputation.repository.interface';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';
import { PrismaReputationWriteActorReader } from '../src/modules/users/infrastructure/repositories/prisma-reputation-write-actor.reader';
import { PrismaReputationEntryReader } from '../src/modules/reputation/infrastructure/repositories/prisma-reputation-entry.reader';

describe('Reputation write ownership (e2e)', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let repository: ReputationRepository;
  let actor: string;
  let moderator: string;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    prisma = fixture.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    await app.init();
    repository = app.get(REPUTATION_REPOSITORY);
    actor = await register();
    moderator = await register();
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  async function register() {
    const suffix = randomUUID().replaceAll('-', '');
    return (
      await app.get(AuthenticationPresentationService).register({
        email: `rep-write-${suffix}@dss.test`,
        username: 'rw' + suffix,
        displayName: 'Synthetic Reputation Writer',
        password: 'synthetic-reputation-write-password-123',
      })
    ).user.id;
  }
  function input(recipientId: string, value: -1 | 1 = 1) {
    return {
      actorId: actor,
      recipientId,
      value,
      reason: 'Synthetic explainable decision',
      cooldownStartedAfter: new Date(Date.now() - 86400000),
    };
  }
  async function snapshot() {
    return {
      ledger: await prisma.reputationEntry.findMany({ orderBy: { id: 'asc' } }),
      audit: await prisma.auditRecord.count(),
      outbox: await prisma.outboxEvent.count(),
    };
  }
  function assertSchedule() {
    const queries = fixture.queries.map((sql) => sql.trimStart());
    const insert = queries.findIndex((sql) =>
      /INSERT INTO .*"reputation_entries"/.test(sql),
    );
    const profiles = queries.findIndex(
      (sql) => /^SELECT\b/.test(sql) && /FROM .*"users"/.test(sql),
    );
    const reversal = queries.findIndex(
      (sql, index) =>
        index > profiles &&
        /^SELECT\b/.test(sql) &&
        /FROM .*"reputation_entries"/.test(sql),
    );
    const audit = queries.findIndex((sql) =>
      /INSERT INTO .*"audit_records"/.test(sql),
    );
    expect(insert).toBeGreaterThan(-1);
    expect(profiles).toBeGreaterThan(insert);
    expect(reversal).toBeGreaterThan(profiles);
    const profileReads = queries
      .map((sql, index) => ({ sql, index }))
      .filter(({ sql }) => /^SELECT\b/.test(sql) && /FROM .*"users"/.test(sql));
    expect(profileReads).toHaveLength(2);
    expect(profileReads[1].index).toBeGreaterThan(reversal);
    expect(audit).toBeGreaterThan(profileReads[1].index);
    expect(
      queries.filter(
        (sql) => /^SELECT\b/.test(sql) && /FROM .*"users"/.test(sql),
      ),
    ).toHaveLength(2);
    const projection = queries[profiles].slice(
      0,
      queries[profiles].indexOf(' FROM '),
    );
    for (const field of ['id', 'username', 'displayName', 'avatarUrl'])
      expect(projection).toContain('"' + field + '"');
    for (const field of [
      'passwordHash',
      'email',
      'status',
      'avatarMediaId',
      'authVersion',
    ])
      expect(projection).not.toContain('"' + field + '"');
    expect(queries.at(-1)).toBe('COMMIT');
  }
  it('preserves INSERT → actor → reversal → evidence order and four-field public write responses', async () => {
    const recipient = await register();
    fixture.queries.length = 0;
    const entry = await repository.createDirect(input(recipient));
    assertSchedule();
    expect(entry).toMatchObject({
      recipientId: recipient,
      value: 1,
      reversal: null,
      actor: { id: actor },
    });
    expect(Object.keys(entry!.actor).sort()).toEqual([
      'avatarUrl',
      'displayName',
      'id',
      'username',
    ]);
    fixture.queries.length = 0;
    const reversed = await repository.reverse(
      entry!.id,
      moderator,
      recipient,
      -1,
      'Synthetic review',
    );
    assertSchedule();
    expect(reversed).toMatchObject({
      recipientId: recipient,
      value: -1,
      reversal: null,
      actor: { id: moderator },
    });
    expect(await repository.history(recipient, 1, 20)).toMatchObject({
      total: 1,
      score: 0,
      items: [{ id: entry!.id, reversal: { id: reversed!.id } }],
    });
  });
  it('short-circuits duplicate direct decisions before display SQL or new evidence', async () => {
    const recipient = await register();
    await repository.createDirect(input(recipient));
    const before = await snapshot();
    fixture.queries.length = 0;
    expect(await repository.createDirect(input(recipient))).toBeNull();
    expect(fixture.queries.some((sql) => /FROM .*"users"/.test(sql))).toBe(
      false,
    );
    expect(await snapshot()).toEqual(before);
  });
  it('short-circuits duplicate reversals before display SQL or new evidence', async () => {
    const recipient = await register();
    const original = await repository.createDirect(input(recipient));
    await repository.reverse(
      original!.id,
      moderator,
      recipient,
      -1,
      'Synthetic review',
    );
    const before = await snapshot();
    fixture.queries.length = 0;
    expect(
      await repository.reverse(
        original!.id,
        moderator,
        recipient,
        -1,
        'Synthetic second review',
      ),
    ).toBeNull();
    expect(fixture.queries.some((sql) => /FROM .*"users"/.test(sql))).toBe(
      false,
    );
    expect(await snapshot()).toEqual(before);
  });
  it('retains a strict createdAt > cooldown boundary, without rounding or permanent pair uniqueness', async () => {
    const recipient = await register();
    const original = await repository.createDirect(input(recipient));
    expect(
      await repository.createDirect({
        ...input(recipient),
        cooldownStartedAfter: new Date(original!.createdAt.getTime() - 1),
      }),
    ).toBeNull();
    expect(
      await repository.createDirect({
        ...input(recipient, -1),
        cooldownStartedAfter: original!.createdAt,
      }),
    ).not.toBeNull();
  });
  it('preserves negative decisions and positive compensations as two immutable rows', async () => {
    const recipient = await register();
    const original = await repository.createDirect(input(recipient, -1));
    const reversed = await repository.reverse(
      original!.id,
      moderator,
      recipient,
      1,
      'Synthetic correction',
    );
    expect(reversed?.value).toBe(1);
    expect(
      await prisma.reputationEntry.count({ where: { recipientId: recipient } }),
    ).toBe(2);
    expect(await repository.history(recipient, 1, 20)).toMatchObject({
      total: 1,
      score: 0,
    });
  });
  it('does not move account eligibility from the application into the persistence display operation', async () => {
    const recipient = await register();
    await prisma.user.update({
      where: { id: actor },
      data: { status: 'BANNED' },
    });
    try {
      expect(await repository.createDirect(input(recipient))).toMatchObject({
        actor: { id: actor },
      });
    } finally {
      await prisma.user.update({
        where: { id: actor },
        data: { status: 'ACTIVE' },
      });
    }
  });
  it('retains default Read Committed through actual evidence append', async () => {
    const recipient = await register();
    const audit = app.get<AuditWriterService>(AuditWriterService);
    const append = audit.append.bind(audit) as AuditWriterService['append'];
    let level = '';
    jest
      .spyOn(audit, 'append')
      .mockImplementation(async (transaction, entry) => {
        const [row] = await transaction.$queryRaw<
          { transaction_isolation: string }[]
        >`SHOW transaction_isolation`;
        level = row.transaction_isolation;
        return append(transaction, entry);
      });
    await repository.createDirect(input(recipient));
    expect(level).toBe('read committed');
  });
  it.each([
    'direct-audit',
    'direct-outbox',
    'reverse-audit',
    'reverse-outbox',
  ] as const)(
    'rolls back after an actual %s evidence write succeeds then fails',
    async (stage) => {
      const recipient = await register();
      const original = stage.startsWith('reverse')
        ? await repository.createDirect(input(recipient))
        : null;
      const before = await snapshot();
      const failure = new Error('Synthetic post-evidence failure');
      let appended = false;
      if (stage.endsWith('audit')) {
        const audit = app.get<AuditWriterService>(AuditWriterService);
        const actual = audit.append.bind(audit) as AuditWriterService['append'];
        jest
          .spyOn(audit, 'append')
          .mockImplementation(async (transaction, entry) => {
            await actual(transaction, entry);
            appended = true;
            throw failure;
          });
      } else {
        const outbox = app.get<OutboxWriterService>(OutboxWriterService);
        const actual = outbox.append.bind(
          outbox,
        ) as OutboxWriterService['append'];
        jest
          .spyOn(outbox, 'append')
          .mockImplementation(async (transaction, event) => {
            await actual(transaction, event);
            appended = true;
            throw failure;
          });
      }
      const write = original
        ? repository.reverse(
            original.id,
            moderator,
            recipient,
            -1,
            'Synthetic review',
          )
        : repository.createDirect(input(recipient));
      await expect(write).rejects.toBe(failure);
      expect(appended).toBe(true);
      expect(await snapshot()).toEqual(before);
    },
  );
  async function raceBehindLock<T>(
    coordinate: string,
    operations: () => Promise<T>[],
  ) {
    let release!: () => void;
    let ready!: () => void;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const acquired = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const holder = prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${coordinate}, 0))`;
      ready();
      await released;
    });
    await acquired;
    const results = Promise.allSettled(operations());
    try {
      const deadline = Date.now() + 2000;
      let waiting = 0;
      do {
        const [row] = await prisma.$queryRaw<
          { waiting: number }[]
        >`SELECT count(*)::int AS waiting FROM pg_locks
          WHERE locktype = 'advisory' AND NOT granted AND database = (SELECT oid FROM pg_database WHERE datname=current_database())
          AND classid::bigint = ((hashtextextended(${coordinate}, 0) >> 32) & 4294967295)
          AND objid::bigint = (hashtextextended(${coordinate}, 0) & 4294967295)`;
        waiting = row.waiting;
        if (waiting === 2) break;
      } while (Date.now() < deadline);
      expect(waiting).toBe(2);
    } finally {
      release();
      await holder;
    }
    const settled = await results;
    for (const result of settled)
      if (result.status === 'rejected') throw result.reason;
    return settled.map((result) => (result as PromiseFulfilledResult<T>).value);
  }
  it('serializes two direct decisions observed waiting on the same advisory lock', async () => {
    const recipient = await register();
    const result = await raceBehindLock(
      `reputation:${actor}:${recipient}`,
      () => [
        repository.createDirect(input(recipient)),
        repository.createDirect(input(recipient, -1)),
      ],
    );
    expect(result.filter(Boolean)).toHaveLength(1);
    expect(result.filter((row) => row === null)).toHaveLength(1);
    expect(
      await prisma.reputationEntry.count({ where: { recipientId: recipient } }),
    ).toBe(1);
  });
  it('serializes two reversals observed waiting on the same advisory lock', async () => {
    const recipient = await register();
    const original = await repository.createDirect(input(recipient));
    const result = await raceBehindLock(
      `reputation-reversal:${original!.id}`,
      () => [
        repository.reverse(
          original!.id,
          moderator,
          recipient,
          -1,
          'Synthetic A',
        ),
        repository.reverse(original!.id, actor, recipient, -1, 'Synthetic B'),
      ],
    );
    expect(result.filter(Boolean)).toHaveLength(1);
    expect(result.filter((row) => row === null)).toHaveLength(1);
    expect(
      await prisma.reputationEntry.count({
        where: { reversesEntryId: original!.id },
      }),
    ).toBe(1);
  });
  it.each([
    'direct-first',
    'direct-empty',
    'reverse-first',
    'reverse-empty',
  ] as const)(
    'rolls back after the actual %s Users lookup fails',
    async (stage) => {
      const recipient = await register();
      const original = stage.startsWith('reverse')
        ? await repository.createDirect(input(recipient))
        : null;
      const before = await snapshot();
      const failure = new Error('Synthetic display provider failure');
      let calls = 0;
      const reader = app.get<PrismaReputationWriteActorReader>(
        PrismaReputationWriteActorReader,
      );
      const actual = reader.read.bind(
        reader,
      ) as PrismaReputationWriteActorReader['read'];
      jest
        .spyOn(reader, 'read')
        .mockImplementation(async (transaction, ids) => {
          const rows = await actual(transaction, ids);
          if (++calls === (stage.endsWith('empty') ? 2 : 1)) throw failure;
          return rows;
        });
      fixture.queries.length = 0;
      const operation = original
        ? repository.reverse(
            original.id,
            moderator,
            recipient,
            -1,
            'Synthetic review',
          )
        : repository.createDirect(input(recipient));
      await expect(operation).rejects.toBe(failure);
      expect(
        fixture.queries.some((sql) =>
          /INSERT INTO .*"reputation_entries"/.test(sql),
        ),
      ).toBe(true);
      expect(
        fixture.queries.some((sql) =>
          /INSERT INTO .*"audit_records"/.test(sql),
        ),
      ).toBe(false);
      expect(fixture.queries.at(-1)).toBe('ROLLBACK');
      expect(await snapshot()).toEqual(before);
    },
  );
  it('rolls back when a successful display query is followed by incomplete provider evidence', async () => {
    const recipient = await register();
    const before = await snapshot();
    const reader = app.get<PrismaReputationWriteActorReader>(
      PrismaReputationWriteActorReader,
    );
    const actual = reader.read.bind(
      reader,
    ) as PrismaReputationWriteActorReader['read'];
    jest
      .spyOn(reader, 'read')
      .mockImplementationOnce(async (transaction, ids) => {
        const rows = await actual(transaction, ids);
        rows.delete(actor);
        return rows;
      });
    await expect(repository.createDirect(input(recipient))).rejects.toThrow(
      'Reputation actor evidence is incomplete.',
    );
    expect(await snapshot()).toEqual(before);
  });
  it('rolls back when the genuine compensation read fails after the actor lookup', async () => {
    const recipient = await register();
    const before = await snapshot();
    const failure = new Error('Synthetic compensation read failure');
    const reader = app.get<PrismaReputationEntryReader>(
      PrismaReputationEntryReader,
    );
    const actual = reader.reversals.bind(
      reader,
    ) as PrismaReputationEntryReader['reversals'];
    jest
      .spyOn(reader, 'reversals')
      .mockImplementationOnce(async (transaction, ids) => {
        await actual(transaction, ids);
        throw failure;
      });
    await expect(repository.createDirect(input(recipient))).rejects.toBe(
      failure,
    );
    expect(await snapshot()).toEqual(before);
  });
  it.each(['direct', 'reverse'] as const)(
    'rolls back %s after a real ledger INSERT succeeds and then fails',
    async (kind) => {
      const recipient = await register();
      const original =
        kind === 'reverse'
          ? await repository.createDirect(input(recipient))
          : null;
      const before = await snapshot();
      const failure = new Error('Synthetic post-ledger-insert failure');
      let inserted = false;
      const run = prisma.$transaction.bind(prisma) as (
        callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
      ) => Promise<unknown>;
      const hook = (
        callback: (transaction: Prisma.TransactionClient) => Promise<unknown>,
      ) =>
        run(async (transaction) => {
          const delegate = transaction.reputationEntry as unknown as {
            create(args: unknown): Promise<unknown>;
          };
          const actual = delegate.create.bind(
            delegate,
          ) as typeof delegate.create;
          jest
            .spyOn(delegate, 'create')
            .mockImplementationOnce(async (args) => {
              await actual(args);
              inserted = true;
              throw failure;
            });
          return callback(transaction);
        });
      jest.spyOn(prisma, '$transaction').mockImplementation(hook);
      const operation = original
        ? repository.reverse(
            original.id,
            moderator,
            recipient,
            -1,
            'Synthetic review',
          )
        : repository.createDirect(input(recipient));
      await expect(operation).rejects.toBe(failure);
      expect(inserted).toBe(true);
      expect(await snapshot()).toEqual(before);
    },
  );
  it('reads committed display changes after INSERT at the existing lookup point', async () => {
    const recipient = await register();
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: actor },
      select: { displayName: true },
    });
    const reader = app.get<PrismaReputationWriteActorReader>(
      PrismaReputationWriteActorReader,
    );
    const actual = reader.read.bind(
      reader,
    ) as PrismaReputationWriteActorReader['read'];
    jest
      .spyOn(reader, 'read')
      .mockImplementationOnce(async (transaction, ids) => {
        // Non-key profile field: compatible with the ledger FK's key-share lock, no sleeping or enlarged budget.
        await prisma.user.update({
          where: { id: actor },
          data: { displayName: 'Synthetic fresh lookup' },
        });
        return actual(transaction, ids);
      });
    try {
      expect(await repository.createDirect(input(recipient))).toMatchObject({
        actor: { displayName: 'Synthetic fresh lookup' },
      });
    } finally {
      await prisma.user.update({
        where: { id: actor },
        data: { displayName: before.displayName },
      });
    }
  });
  it('keeps exact ID/value-only event payloads and immutable compensation evidence', async () => {
    const recipient = await register();
    const original = await repository.createDirect(input(recipient));
    const reversed = await repository.reverse(
      original!.id,
      moderator,
      recipient,
      -1,
      'Synthetic review',
    );
    for (const [entry, eventName, payload] of [
      [
        original!,
        'reputation.direct.changed.v1',
        { recipientId: recipient, value: 1 },
      ],
      [
        reversed!,
        'reputation.direct.reversed.v1',
        { recipientId: recipient, value: -1, reversesEntryId: original!.id },
      ],
    ] as const) {
      const event = await prisma.outboxEvent.findFirstOrThrow({
        where: { aggregateId: entry.id, eventName },
      });
      expect(event).toMatchObject({
        producer: 'dss.api.reputation',
        eventCategory: 'integration',
        eventVersion: 1,
        actorId: entry.actor.id,
      });
      expect(event.payload).toEqual(payload);
    }
    await expect(
      prisma.reputationEntry.update({
        where: { id: original!.id },
        data: { reason: 'Synthetic forbidden rewrite' },
      }),
    ).rejects.toThrow('reputation ledger entries are immutable');
  });
});
