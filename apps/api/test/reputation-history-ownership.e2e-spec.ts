/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Read Boundary E2E
 * 📄 File: apps/api/test/reputation-history-ownership.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Pins public ledger projection semantics before moving profile reads to Users ownership.
 *
 * 🧠 Responsibilities:
 * • verifies original/reversal history, signed score, tie ordering and pagination;
 * • checks live allowlisted actor presentation without new account eligibility rules;
 * • records actual statement ordering inside the current read transaction.
 *
 * 🏗️ Architecture:
 * Real AppModule with an owned migrated disposable schema; immutable history stays enabled.
 *
 * ⚠️ Important:
 * No successful authorization mock, new isolation policy or production schema change.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { ReputationService } from '../src/modules/reputation/application/services/reputation.service';
import {
  REPUTATION_REPOSITORY,
  type ReputationRepository,
} from '../src/modules/reputation/domain/repositories/reputation.repository.interface';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';
import { PrismaReputationEntryReader } from '../src/modules/reputation/infrastructure/repositories/prisma-reputation-entry.reader';
import { PrismaReputationActorReader } from '../src/modules/users/infrastructure/repositories/prisma-reputation-actor.reader';

describe('Reputation history ownership (e2e)', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let repository: ReputationRepository;
  let recipient: string;
  let actors: string[];
  let originals: { id: string; actorId: string; value: number }[];
  let reversal: { id: string };
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
    async function register() {
      const suffix = randomUUID().replaceAll('-', '');
      const result = await app.get(AuthenticationPresentationService).register({
        email: `reputation-${suffix}@dss.test`,
        username: `rep${suffix}`,
        password: 'synthetic-reputation-password-123',
        displayName: 'Synthetic Reputation Pilot',
      });
      return result.user.id;
    }
    recipient = await register();
    actors = [await register(), await register(), await register()];
    originals = [];
    for (const [index, actorId] of actors.entries()) {
      originals.push(
        await prisma.reputationEntry.create({
          data: {
            actorId,
            recipientId: recipient,
            value: index === 1 ? -1 : 1,
            reason: `Synthetic original ${index}`,
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        }),
      );
    }
    reversal = await prisma.reputationEntry.create({
      data: {
        actorId: actors[1],
        recipientId: recipient,
        value: -1,
        reason: 'Synthetic compensating reversal',
        reversesEntryId: originals[0].id,
        createdAt: new Date('2026-01-02T00:00:00Z'),
      },
    });
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });

  it('keeps originals only in pages but includes compensating entries in the signed score', async () => {
    const page = await repository.history(recipient, 1, 20);
    expect(page).toMatchObject({
      total: 3,
      score: 0,
      totalPages: 1,
      page: 1,
      limit: 20,
    });
    expect(page.items.map(({ id }) => id)).toEqual(
      originals
        .map(({ id }) => id)
        .sort()
        .reverse(),
    );
    expect(
      page.items.find(({ id }) => id === originals[0].id)?.reversal,
    ).toMatchObject({
      id: reversal.id,
      reason: 'Synthetic compensating reversal',
      actor: { id: actors[1] },
      createdAt: new Date('2026-01-02T00:00:00Z'),
    });
    expect(
      page.items.filter(({ reversal: value }) => value === null),
    ).toHaveLength(2);
  });
  it('preserves tied timestamp ordering, exact total and beyond-last-page metadata', async () => {
    const first = await repository.history(recipient, 1, 2);
    const second = await repository.history(recipient, 2, 2);
    const beyond = await repository.history(recipient, 3, 2);
    expect([...first.items, ...second.items].map(({ id }) => id)).toEqual(
      originals
        .map(({ id }) => id)
        .sort()
        .reverse(),
    );
    for (const page of [first, second, beyond])
      expect(page).toMatchObject({
        total: 3,
        totalPages: 2,
        limit: 2,
        score: 0,
      });
    expect(beyond).toMatchObject({ items: [], page: 3 });
  });
  it('returns zero score and pages for an existing recipient without ledger entries', async () => {
    expect(await app.get(ReputationService).history(actors[2])).toEqual({
      items: [],
      total: 0,
      score: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });
  it('keeps current actor display fields allowlisted in originals and reversals', async () => {
    const page = await repository.history(recipient, 1, 20);
    for (const item of page.items) {
      for (const actor of [
        item.actor,
        ...(item.reversal ? [item.reversal.actor] : []),
      ]) {
        expect(Object.keys(actor).sort()).toEqual([
          'avatarUrl',
          'displayName',
          'id',
          'username',
        ]);
        expect(actor.avatarUrl).toBeNull();
      }
    }
  });
  it('reads current profile presentation rather than an immutable actor snapshot', async () => {
    const username = `renamed${randomUUID().replaceAll('-', '')}`;
    await prisma.user.update({
      where: { id: actors[1] },
      data: {
        username,
        displayName: null,
        avatarUrl: 'https://example.test/synthetic-avatar.png',
      },
    });
    const page = await repository.history(recipient, 1, 20);
    const expected = {
      id: actors[1],
      username,
      displayName: null,
      avatarUrl: 'https://example.test/synthetic-avatar.png',
    };
    expect(
      page.items.find(({ actor }) => actor.id === actors[1])?.actor,
    ).toEqual(expected);
    expect(
      page.items.find(({ id }) => id === originals[0].id)?.reversal?.actor,
    ).toEqual(expected);
  });
  it.each(['BANNED', 'DEACTIVATED', 'DELETED'] as const)(
    'retains public historical actors with %s account state',
    async (status) => {
      await prisma.user.update({ where: { id: actors[0] }, data: { status } });
      const page = await repository.history(recipient, 1, 20);
      expect(
        page.items.find(({ id }) => id === originals[0].id)?.actor.id,
      ).toBe(actors[0]);
      expect(page.total).toBe(3);
    },
  );
  it('distinguishes absent original entries from reversal IDs', async () => {
    expect(await repository.findOriginalById(randomUUID())).toBeNull();
    expect(await repository.findOriginalById(reversal.id)).toBeNull();
    expect(await repository.findOriginalById(originals[0].id)).toMatchObject({
      id: originals[0].id,
      actor: { id: actors[0] },
      reversal: { id: reversal.id },
    });
  });
  it('rejects a missing recipient before reading its history', async () => {
    const read = jest.spyOn(repository, 'history');
    await expect(
      app.get(ReputationService).history(randomUUID()),
    ).rejects.toThrow('Reputation recipient not found.');
    expect(read).not.toHaveBeenCalled();
  });
  it('records the current history statement schedule for ownership transfer', async () => {
    fixture.queries.length = 0;
    await repository.history(recipient, 1, 20);
    const selects = fixture.queries.filter((sql) => /^SELECT\b/i.test(sql));
    expect(selects).toHaveLength(6);
    expect(
      selects.map(
        (sql) =>
          sql.match(/FROM\s+(?:"[^"]+"\.)?"([^"]+)"/)?.[1] ??
          (sql.includes('COUNT(') ? 'count' : 'score'),
      ),
    ).toEqual([
      'reputation_entries',
      'users',
      'reputation_entries',
      'users',
      'reputation_entries',
      'reputation_entries',
    ]);
    expect(selects[4]).toContain('COUNT(');
    expect(selects[5]).toContain('SUM(');
    for (const sql of [selects[1], selects[3]]) {
      const selected = sql.slice(0, sql.indexOf(' FROM '));
      for (const field of [
        'passwordHash',
        'email',
        'status',
        'avatarMediaId',
        'authVersion',
      ])
        expect(selected).not.toContain('"' + field + '"');
    }
    expect(fixture.queries.at(-1)).toBe('COMMIT');
  });
  it('matches the pre-transfer Prisma relation projection against the same immutable ledger', async () => {
    const actor = {
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    } as const;
    const where = { recipientId: recipient, reversesEntryId: null };
    // Historical oracle copied from cf04110: the former repository's exact relation read, not a second runtime implementation.
    const [items, total, score] = await prisma.$transaction([
      prisma.reputationEntry.findMany({
        where,
        include: {
          actor,
          reversal: {
            select: { id: true, reason: true, createdAt: true, actor },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 20,
      }),
      prisma.reputationEntry.count({ where }),
      prisma.reputationEntry.aggregate({
        where: { recipientId: recipient },
        _sum: { value: true },
      }),
    ]);
    expect(await repository.history(recipient, 1, 20)).toEqual({
      items: items.map(
        ({
          id,
          actor: profile,
          recipientId,
          value,
          reason,
          createdAt,
          reversal: reversed,
        }) => ({
          id,
          actor: profile,
          recipientId,
          value,
          reason,
          createdAt,
          reversal: reversed,
        }),
      ),
      total,
      score: score._sum.value ?? 0,
      page: 1,
      limit: 20,
      totalPages: Math.ceil(total / 20),
    });
  });
  it('keeps original-entry lookup independent and skips actor reads when absent', async () => {
    fixture.queries.length = 0;
    await repository.findOriginalById(randomUUID());
    expect(fixture.queries).toHaveLength(1);
    fixture.queries.length = 0;
    await repository.findOriginalById(originals[0].id);
    expect(fixture.queries.filter((sql) => /^SELECT\b/.test(sql))).toHaveLength(
      4,
    );
    expect(fixture.queries).not.toContain('COMMIT');
  });
  it('retains Read Committed and distinct original/reversal profile observation points', async () => {
    const reader = app.get<PrismaReputationEntryReader>(
      PrismaReputationEntryReader,
    );
    const read = reader.reversals.bind(
      reader,
    ) as PrismaReputationEntryReader['reversals'];
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: actors[1] },
      select: { username: true },
    });
    const renamed = `fresh${randomUUID().replaceAll('-', '')}`;
    let isolation = '';
    jest
      .spyOn(reader, 'reversals')
      .mockImplementation(async (transaction, ids) => {
        const [level] = await transaction.$queryRaw<
          { transaction_isolation: string }[]
        >`SHOW transaction_isolation`;
        isolation = level.transaction_isolation;
        const rows = await read(transaction, ids);
        await prisma.user.update({
          where: { id: actors[1] },
          data: { username: renamed },
        });
        return rows;
      });
    const page = await repository.history(recipient, 1, 20);
    expect(isolation).toBe('read committed');
    expect(
      page.items.find(({ actor }) => actor.id === actors[1])?.actor.username,
    ).toBe(before.username);
    expect(
      page.items.find(({ id }) => id === originals[0].id)?.reversal?.actor
        .username,
    ).toBe(renamed);
  });
  it('propagates a later actor-provider failure, rolls back the read transaction and succeeds on a new call', async () => {
    const reader = app.get<PrismaReputationActorReader>(
      PrismaReputationActorReader,
    );
    const actual = reader.read.bind(
      reader,
    ) as PrismaReputationActorReader['read'];
    const failure = new Error('Synthetic reputation actor failure');
    jest
      .spyOn(reader, 'read')
      .mockImplementationOnce(actual)
      .mockRejectedValueOnce(failure);
    fixture.queries.length = 0;
    await expect(repository.history(recipient, 1, 20)).rejects.toBe(failure);
    expect(fixture.queries.at(-1)).toBe('ROLLBACK');
    expect(fixture.queries.some((sql) => sql.includes('COUNT('))).toBe(false);
    jest.restoreAllMocks();
    expect(await repository.history(recipient, 1, 20)).toMatchObject({
      total: 3,
      score: 0,
    });
  });
  it('retains the installed Prisma 7 batch acquisition/runtime budgets when moving history to a callback', async () => {
    type StartOptions = {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: string;
    };
    // Test-only call-through instrumentation of the pinned engine. Never rely on private Prisma APIs in production.
    const engine = (
      prisma as unknown as {
        _engine: {
          transaction(
            action: string,
            headers: unknown,
            options: StartOptions,
          ): Promise<unknown>;
        };
      }
    )._engine;
    const calls = jest.spyOn(engine, 'transaction');
    const starts = () =>
      calls.mock.calls
        .filter(([action]) => action === 'start')
        .map(([, , options]) => ({
          maxWait: options.maxWait,
          timeout: options.timeout,
          isolationLevel: options.isolationLevel,
        }));
    await prisma.$transaction([
      prisma.reputationEntry.count({
        where: { recipientId: recipient, reversesEntryId: null },
      }),
      prisma.reputationEntry.aggregate({
        where: { recipientId: recipient },
        _sum: { value: true },
      }),
    ]);
    const batch = starts();
    calls.mockClear();
    await repository.history(recipient, 1, 20);
    expect(batch).toEqual([
      { maxWait: 2000, timeout: 5000, isolationLevel: undefined },
    ]);
    expect(starts()).toEqual(batch);
  });
});
