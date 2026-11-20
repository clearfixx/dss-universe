/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: C2.2 Levels Synchronization Regression
 * 📄 File: apps/api/test/levels-synchronization.e2e-spec.ts
 * 🎯 Purpose: Proves lock-before-read ordering and atomic owned level effects.
 * 🧠 Responsibilities: Exercises real event contention, independent users and rollback.
 * 🏗️ Architecture: Actual API graph, migrated owned schema and PostgreSQL lock observations.
 * ⚠️ Important: PR154 retains the original bad-behavior characterization; this suite tests L1.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { IntegrationEventJob } from '@dss/jobs';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import { PrismaTransactionalPointsBalanceReader } from '@api/modules/community-points/infrastructure';
import { PrismaLevelSynchronizationWriter } from '@api/modules/levels/infrastructure';
import { AppModule } from '../src/app.module';
import { CommunityPointsService } from '../src/modules/community-points/application/services/community-points.service';
import { LevelsService } from '../src/modules/levels/application/services/levels.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, resolve: () => release() };
}

describe('C2.2 Levels synchronization (migrated DB)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let controls: Pool;
  let points: CommunityPointsService;
  let levels: LevelsService;
  let balances: PrismaTransactionalPointsBalanceReader;
  let writer: PrismaLevelSynchronizationWriter;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    const context = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = context.createNestApplication();
    await app.init();
    controls = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
    points = app.get(CommunityPointsService);
    levels = app.get(LevelsService);
    balances = app.get(PrismaTransactionalPointsBalanceReader);
    writer = app.get(PrismaLevelSynchronizationWriter);
  }, 60000);
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      try {
        await controls?.end();
      } finally {
        await fixture?.close();
      }
    }
  });
  afterEach(() => jest.restoreAllMocks());

  async function user() {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `${id}@dss.test`,
        username: id,
        passwordHash: 'synthetic-not-login-evidence',
        status: 'ACTIVE',
      },
    });
    return id;
  }

  async function award(
    userId: string,
    amount: number,
  ): Promise<IntegrationEventJob> {
    await fixture.prisma.communityPointRule.update({
      where: { key: 'reputation.positive' },
      data: { points: amount, dailyLimit: null, enabled: true },
    });
    const result = await points.consume({
      eventId: randomUUID(),
      eventName: 'reputation.direct.changed.v1',
      eventVersion: 1,
      category: 'integration',
      producer: 'dss.api.reputation',
      aggregateType: 'ReputationEntry',
      aggregateId: randomUUID(),
      actorId: userId,
      payload: { recipientId: userId, value: 1 },
      occurredAt: new Date().toISOString(),
    });
    expect(result.status).toBe('AWARDED');
    if (!result.entry) throw new Error('Actual Points award missing.');
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: result.entry.id,
        eventName: 'community-points.awarded.v1',
      },
    });
    return {
      eventId: event.id,
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      category: 'integration',
      producer: event.producer,
      aggregateType: 'CommunityPointEntry',
      aggregateId: result.entry.id,
      payload: event.payload,
      occurredAt: event.occurredAt.toISOString(),
    };
  }

  function pauseRead(userId: string) {
    const ready = barrier(),
      release = barrier();
    let captured: { balance: number; pid: number } | undefined;
    const seen: { userId: string; balance: number }[] = [];
    const original = balances.balance.bind(
      balances,
    ) as PrismaTransactionalPointsBalanceReader['balance'];
    jest
      .spyOn(balances, 'balance')
      .mockImplementation(async (transaction, id) => {
        const balance = await original(transaction, id);
        seen.push({ userId: id, balance });
        if (id === userId && !captured) {
          const [row] = await transaction.$queryRaw<
            { pid: number }[]
          >`SELECT pg_backend_pid()::int AS pid`;
          captured = { balance, pid: row.pid };
          ready.resolve();
          await release.promise;
        }
        return balance;
      });
    return {
      ready: ready.promise,
      release: release.resolve,
      seen,
      captured: () => {
        if (!captured)
          throw new Error('Expected actual captured balance read.');
        return captured;
      },
    };
  }

  async function reached(
    pause: ReturnType<typeof pauseRead>,
    pending: ReturnType<LevelsService['consume']>,
  ) {
    await Promise.race([
      pause.ready,
      pending.then(() => {
        throw new Error('Expected held transactional balance read.');
      }),
    ]);
  }

  async function blockedBy(pid: number): Promise<number> {
    const deadline = performance.now() + 2000;
    do {
      const result = await controls.query<{ pid: number }>(
        "SELECT pid FROM pg_stat_activity WHERE state='active' AND $1::int=ANY(pg_blocking_pids(pid))",
        [pid],
      );
      if (result.rows[0]) return result.rows[0].pid;
    } while (performance.now() < deadline);
    throw new Error('Expected an actual PostgreSQL user-lock waiter.');
  }

  async function evidence(userId: string, eventId: string) {
    return {
      transitions: await fixture.prisma.levelTransition.count({
        where: { userId },
      }),
      markers: await fixture.prisma.processedEvent.count({
        where: { eventId, consumerName: 'dss.api.levels' },
      }),
      audit: await fixture.prisma.auditRecord.count({
        where: {
          action: 'levels.changed',
          metadata: { path: ['userId'], equals: userId },
        },
      }),
      outbox: await fixture.prisma.outboxEvent.count({
        where: { producer: 'dss.api.levels', aggregateId: userId },
      }),
    };
  }

  it('serializes distinct events before reading their authoritative balances', async () => {
    const id = await user();
    const earlier = await award(id, 10);
    const pause = pauseRead(id);
    const first = levels.consume(earlier);
    let second: ReturnType<LevelsService['consume']> | undefined;
    try {
      await reached(pause, first);
      expect(pause.captured().balance).toBe(10);
      const later = await award(id, 110);
      expect(await points.balance(id)).toBe(120);
      second = levels.consume(later);
      expect(await blockedBy(pause.captured().pid)).not.toBe(
        pause.captured().pid,
      );
      expect(pause.seen).toEqual([{ userId: id, balance: 10 }]);
      pause.release();
      const [older, newer] = await Promise.all([first, second]);
      expect(older.transitions.map((item) => item.toLevel)).toEqual([1]);
      expect(newer.transitions.map((item) => item.toLevel)).toEqual([2, 3]);
      expect(
        older.transitions.every(
          (item) => item.sourceEventId === earlier.eventId,
        ),
      ).toBe(true);
      expect(
        newer.transitions.every((item) => item.sourceEventId === later.eventId),
      ).toBe(true);
      expect(pause.seen.map((item) => item.balance)).toEqual([10, 120]);
      expect(
        await fixture.prisma.levelTransition.count({
          where: { userId: id, direction: 'DOWN' },
        }),
      ).toBe(0);
      expect(await evidence(id, earlier.eventId)).toEqual({
        transitions: 3,
        markers: 1,
        audit: 3,
        outbox: 3,
      });
      expect(
        await fixture.prisma.processedEvent.count({
          where: { eventId: later.eventId, consumerName: 'dss.api.levels' },
        }),
      ).toBe(1);
      expect(await levels.progress(id)).toMatchObject({
        balance: 120,
        currentLevel: 3,
      });
    } finally {
      pause.release();
      await Promise.allSettled([first, ...(second ? [second] : [])]);
    }
  });

  it('keeps same-event deduplication under observed user-lock contention', async () => {
    const id = await user(),
      event = await award(id, 10);
    const pause = pauseRead(id);
    const first = levels.consume(event);
    let second: ReturnType<LevelsService['consume']> | undefined;
    try {
      await reached(pause, first);
      second = levels.consume(event);
      await blockedBy(pause.captured().pid);
      pause.release();
      const results = await Promise.all([first, second]);
      expect(results.map((item) => item.duplicate)).toEqual([false, true]);
      expect(results[1].transitions).toEqual([]);
      expect(await evidence(id, event.eventId)).toEqual({
        transitions: 1,
        markers: 1,
        audit: 1,
        outbox: 1,
      });
    } finally {
      pause.release();
      await Promise.allSettled([first, ...(second ? [second] : [])]);
    }
  });

  it('allows another user to synchronize while the first user read is held', async () => {
    const firstId = await user(),
      secondId = await user();
    const earlier = await award(firstId, 10),
      other = await award(secondId, 10);
    const pause = pauseRead(firstId);
    let firstDone = false;
    const first = levels.consume(earlier).then((result) => {
      firstDone = true;
      return result;
    });
    try {
      await reached(pause, first);
      const independent = await levels.consume(other);
      expect(independent.transitions.map((item) => item.toLevel)).toEqual([1]);
      expect(firstDone).toBe(false);
      expect(await evidence(secondId, other.eventId)).toEqual({
        transitions: 1,
        markers: 1,
        audit: 1,
        outbox: 1,
      });
      pause.release();
      await first;
    } finally {
      pause.release();
      await Promise.allSettled([first]);
    }
  });

  for (const failure of ['balance', 'definitions'] as const) {
    it(`preserves ${failure} read failure without partial effects`, async () => {
      const id = await user(),
        event = await award(id, 10);
      const error = new Error(`synthetic ${failure} read failure`);
      if (failure === 'balance')
        jest.spyOn(balances, 'balance').mockRejectedValueOnce(error);
      else jest.spyOn(writer, 'definitions').mockRejectedValueOnce(error);
      await expect(levels.consume(event)).rejects.toBe(error);
      expect(await evidence(id, event.eventId)).toEqual({
        transitions: 0,
        markers: 0,
        audit: 0,
        outbox: 0,
      });
    });
  }

  it('rolls back the transition when its Audit append fails', async () => {
    const id = await user(),
      event = await award(id, 10);
    const audit = app.get(AuditWriterService);
    const error = new Error('synthetic level Audit failure');
    const original = audit.append.bind(audit) as AuditWriterService['append'];
    jest.spyOn(audit, 'append').mockImplementation((transaction, entry) => {
      if (entry.action === 'levels.changed') return Promise.reject(error);
      return original(transaction, entry);
    });
    await expect(levels.consume(event)).rejects.toBe(error);
    expect(await evidence(id, event.eventId)).toEqual({
      transitions: 0,
      markers: 0,
      audit: 0,
      outbox: 0,
    });
  });

  it('rolls back the transition and Audit when Outbox append fails', async () => {
    const id = await user(),
      event = await award(id, 10);
    const outbox = app.get(OutboxWriterService);
    const error = new Error('synthetic level Outbox failure');
    const original = outbox.append.bind(
      outbox,
    ) as OutboxWriterService['append'];
    let auditBeforeFailure = 0;
    jest
      .spyOn(outbox, 'append')
      .mockImplementation(async (transaction, envelope) => {
        if (envelope.producer === 'dss.api.levels') {
          auditBeforeFailure = await transaction.auditRecord.count({
            where: {
              action: 'levels.changed',
              metadata: { path: ['userId'], equals: id },
            },
          });
          throw error;
        }
        return original(transaction, envelope);
      });
    await expect(levels.consume(event)).rejects.toBe(error);
    expect(auditBeforeFailure).toBe(1);
    expect(await evidence(id, event.eventId)).toEqual({
      transitions: 0,
      markers: 0,
      audit: 0,
      outbox: 0,
    });
  });

  it('rolls back all crossed levels and evidence when final marker insertion fails', async () => {
    const id = await user(),
      event = await award(id, 120);
    await controls.query(`CREATE FUNCTION reject_level_marker() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW."consumerName"='dss.api.levels' THEN RAISE EXCEPTION 'synthetic level marker failure'; END IF; RETURN NEW; END $$`);
    await controls.query(
      `CREATE TRIGGER synthetic_level_marker BEFORE INSERT ON processed_events FOR EACH ROW EXECUTE FUNCTION reject_level_marker()`,
    );
    try {
      await expect(levels.consume(event)).rejects.toThrow(
        'synthetic level marker failure',
      );
      expect(await evidence(id, event.eventId)).toEqual({
        transitions: 0,
        markers: 0,
        audit: 0,
        outbox: 0,
      });
    } finally {
      await controls.query(
        'DROP TRIGGER synthetic_level_marker ON processed_events',
      );
    }
    const result = await levels.consume(event);
    expect(result.transitions.map((item) => item.toLevel)).toEqual([1, 2, 3]);
    expect(await evidence(id, event.eventId)).toEqual({
      transitions: 3,
      markers: 1,
      audit: 3,
      outbox: 3,
    });
  });

  it('keeps one scoped balance/definition read and records downward crossings', async () => {
    const id = await user(),
      up = await award(id, 120);
    const synchronize = app.get(PrismaService);
    expect(synchronize).toBe(fixture.prisma);
    fixture.queries.length = 0;
    await levels.consume(up);
    const statements = [...fixture.queries];
    const lock = statements.findIndex((sql) =>
      sql.includes('pg_advisory_xact_lock'),
    );
    const balanceReads = statements
      .map((sql, index) => ({ sql, index }))
      .filter(
        ({ sql }) =>
          /SELECT/i.test(sql) && sql.includes('community_point_entries'),
      );
    const definitionReads = statements
      .map((sql, index) => ({ sql, index }))
      .filter(
        ({ sql }) => /SELECT/i.test(sql) && sql.includes('level_definitions'),
      );
    expect(lock).toBeGreaterThanOrEqual(0);
    expect(balanceReads).toHaveLength(1);
    expect(definitionReads).toHaveLength(1);
    expect(balanceReads[0].index).toBeGreaterThan(lock);
    expect(definitionReads[0].index).toBeGreaterThan(lock);
    const entry = await fixture.prisma.communityPointEntry.findFirstOrThrow({
      where: { userId: id, reversesEntryId: null },
    });
    const reversal = await points.reverse(
      entry.id,
      id,
      'synthetic downward compatibility',
    );
    const source = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: reversal.id,
        eventName: 'community-points.reversed.v1',
      },
    });
    const down = await levels.consume({
      eventId: source.id,
      eventName: source.eventName,
      eventVersion: source.eventVersion,
      category: 'integration',
      producer: source.producer,
      aggregateType: 'CommunityPointEntry',
      aggregateId: reversal.id,
      payload: source.payload,
      occurredAt: source.occurredAt.toISOString(),
    });
    expect(
      down.transitions.map((item) => ({
        from: item.fromLevel,
        to: item.toLevel,
      })),
    ).toEqual([
      { from: 3, to: 2 },
      { from: 2, to: 1 },
      { from: 1, to: 0 },
    ]);
    expect(await levels.progress(id)).toMatchObject({
      balance: 0,
      currentLevel: 0,
    });
  });
});

// A queue may shuffle envelopes. Each level calculation still waits for its railing.
