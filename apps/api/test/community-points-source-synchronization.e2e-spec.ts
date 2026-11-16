/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Community Points Source Synchronization
 * 📄 File: apps/api/test/community-points-source-synchronization.e2e-spec.ts
 * 🎯 Purpose: Proves both source-lock winners and transactional failure recovery.
 * 🧠 Responsibilities: Observes real DB blocking, independent sources and atomic evidence.
 * 🏗️ Architecture: Real owner writers and isolated migrated-schema INSERT barriers.
 * ⚠️ Important: PR161 retains the bad-order proof; synthetic events are not admission/login evidence.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { PointRuleConfigurationAdapter } from '../src/composition/gamification-delivery/gamification-configuration.module';
import { Pool } from 'pg';
import type { IntegrationEventJob } from '@dss/jobs';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import { CommunityPointsService } from '../src/modules/community-points/application/services/community-points.service';
import { PrismaCommunityPointsRepository } from '../src/modules/community-points/infrastructure/repositories/prisma-community-points.repository';
import { PrismaProfileExistenceReader } from '../src/modules/users/infrastructure/repositories/prisma-profile-existence.reader';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Points source synchronization (migrated DB)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let controls: Pool;
  let points: CommunityPointsService;
  let audit: AuditWriterService;
  let outbox: OutboxWriterService;
  const eventName = `audit.points.source.${randomUUID()}.v1`;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    controls = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
    audit = new AuditWriterService(new AuditRedactionService());
    outbox = new OutboxWriterService();
    points = new CommunityPointsService(
      new PrismaCommunityPointsRepository(
        fixture.prisma,
        audit,
        outbox,
        new PointRuleConfigurationAdapter(),
      ),
      new PrismaProfileExistenceReader(fixture.prisma),
    );
    await fixture.prisma.communityPointRule.create({
      data: { key: eventName, eventName, points: 10, dailyLimit: null },
    });
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    try {
      await controls?.end();
    } finally {
      await fixture?.close();
    }
  });

  async function subject() {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        username: id,
        email: `${id}@dss.test`,
        passwordHash: 'synthetic-not-login-evidence',
      },
    });
    return id;
  }
  function award(userId: string, sourceId?: string): IntegrationEventJob {
    return {
      eventId: randomUUID(),
      eventName,
      eventVersion: 1,
      category: 'integration',
      producer: 'audit.synthetic',
      ...(sourceId
        ? { aggregateType: 'ReputationEntry', aggregateId: sourceId }
        : {}),
      payload: { userId },
      occurredAt: '2026-11-15T00:00:00.000Z',
    };
  }
  function control(sourceId: string): IntegrationEventJob {
    return {
      eventId: randomUUID(),
      eventName: 'reputation.direct.reversed.v1',
      eventVersion: 1,
      category: 'integration',
      producer: 'audit.synthetic',
      payload: { reversesEntryId: sourceId },
      occurredAt: '2026-11-15T00:00:01.000Z',
    };
  }
  async function blockedBy(pid: number) {
    const deadline = performance.now() + 2000;
    do {
      const { rows } = await controls.query<{ pid: number }>(
        "SELECT pid FROM pg_stat_activity WHERE state='active' AND $1::int=ANY(pg_blocking_pids(pid))",
        [pid],
      );
      if (rows[0]) return rows[0].pid;
    } while (performance.now() < deadline);
    throw new Error('Expected an actual PostgreSQL lock waiter.');
  }
  async function holdInsert(
    table: 'community_point_entries' | 'community_point_revoked_sources',
    sourceId: string,
  ) {
    const coordinate = `audit.points.insert.${randomUUID()}`;
    if (
      !/^api_boundary_[a-f0-9]{32}$/.test(fixture.schema) ||
      !/^[a-f0-9-]{36}$/.test(sourceId)
    )
      throw new Error('Unexpected fixture identifiers.');
    const originalOnly =
      table === 'community_point_entries'
        ? 'AND NEW."reversesEntryId" IS NULL'
        : '';
    // Both table names are fixed test targets; all interpolated identities are generated above.
    await controls.query(`CREATE FUNCTION "${fixture.schema}".hold_points_insert() RETURNS trigger LANGUAGE plpgsql AS $body$
      BEGIN
        IF NEW."sourceId" = '${sourceId}' ${originalOnly} THEN
          PERFORM pg_advisory_xact_lock(hashtextextended('${coordinate}', 0));
        END IF;
        RETURN NEW;
      END $body$`);
    await controls.query(
      `CREATE TRIGGER hold_points_insert BEFORE INSERT ON "${fixture.schema}".${table} FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".hold_points_insert()`,
    );
    const holder = await controls.connect();
    await holder.query('BEGIN');
    await holder.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
      coordinate,
    ]);
    const {
      rows: [owner],
    } = await holder.query<{ pid: number }>(
      'SELECT pg_backend_pid()::int AS pid',
    );
    let released = false;
    async function release() {
      if (!released) {
        await holder.query('ROLLBACK');
        released = true;
      }
    }
    return {
      pid: owner.pid,
      release,
      async close() {
        try {
          await release();
        } finally {
          holder.release();
        }
        await controls.query(
          `DROP TRIGGER hold_points_insert ON "${fixture.schema}".${table}`,
        );
        await controls.query(
          `DROP FUNCTION "${fixture.schema}".hold_points_insert()`,
        );
      },
    };
  }

  it('reverses a committed award without changing the sequential contract', async () => {
    const userId = await subject(),
      sourceId = randomUUID();
    const awarded = await points.consume(award(userId, sourceId));
    expect(awarded.status).toBe('AWARDED');
    expect(awarded.entry?.points).toBe(10);
    const reversed = await points.consume(control(sourceId));
    expect(reversed.status).toBe('AWARDED');
    expect(reversed.entry?.points).toBe(-10);
    if (!reversed.entry) throw new Error('Expected actual reversal.');
    const compensation =
      await fixture.prisma.communityPointEntry.findUniqueOrThrow({
        where: { id: reversed.entry.id },
      });
    expect(compensation.reversesEntryId).toBe(awarded.entry?.id);
    expect(await points.balance(userId)).toBe(0);
  });
  it('retains legacy suppression and event markers after source revocation', async () => {
    const userId = await subject(),
      sourceId = randomUUID();
    expect(await points.consume(control(sourceId))).toEqual({
      status: 'AWARDED',
      entry: null,
    });
    for (let index = 0; index < 2; index += 1) {
      const event = award(userId, sourceId);
      expect(await points.consume(event)).toEqual({
        status: 'IGNORED',
        entry: null,
      });
      expect(
        await fixture.prisma.processedEvent.count({
          where: {
            eventId: event.eventId,
            consumerName: 'dss.api.community-points',
          },
        }),
      ).toBe(1);
    }
    expect(await points.balance(userId)).toBe(0);
    expect(
      await fixture.prisma.communityPointEntry.count({ where: { userId } }),
    ).toBe(0);
  });

  it('makes source control wait for a held award and compensate its committed entry', async () => {
    const userId = await subject(),
      sourceId = randomUUID();
    const event = award(userId, sourceId),
      withdrawal = control(sourceId);
    const gate = await holdInsert('community_point_entries', sourceId);
    const pending = points.consume(event);
    let reversing: ReturnType<CommunityPointsService['consume']> | undefined;
    try {
      const awardPid = await blockedBy(gate.pid);
      reversing = points.consume(withdrawal);
      expect(await blockedBy(awardPid)).not.toBe(awardPid);
      expect(
        await fixture.prisma.communityPointRevokedSource.count({
          where: { sourceType: 'ReputationEntry', sourceId },
        }),
      ).toBe(0);
      await gate.release();
      const [awarded, reversed] = await Promise.all([pending, reversing]);
      expect(awarded.status).toBe('AWARDED');
      expect(reversed.status).toBe('AWARDED');
      expect(reversed.entry?.points).toBe(-10);
      const original =
        await fixture.prisma.communityPointEntry.findUniqueOrThrow({
          where: { sourceEventId: event.eventId },
          include: { reversal: true },
        });
      expect(original.reversal?.id).toBe(reversed.entry?.id);
      if (!original.reversal)
        throw new Error('Expected the committed compensation.');
      expect(await points.balance(userId)).toBe(0);
      expect(await points.consume(withdrawal)).toEqual({
        status: 'DUPLICATE',
        entry: null,
      });
      expect(await points.balance(userId)).toBe(0);
      expect(
        await fixture.prisma.communityPointEntry.count({ where: { userId } }),
      ).toBe(2);
      expect(
        await fixture.prisma.processedEvent.count({
          where: {
            eventId: event.eventId,
            consumerName: 'dss.api.community-points',
          },
        }),
      ).toBe(1);
      expect(
        await fixture.prisma.auditRecord.count({
          where: {
            metadata: { path: ['userId'], equals: userId },
            action: {
              in: ['community-points.awarded', 'community-points.reversed'],
            },
          },
        }),
      ).toBe(2);
      expect(
        await fixture.prisma.outboxEvent.count({
          where: {
            aggregateId: { in: [original.id, original.reversal.id] },
            producer: 'dss.api.community-points',
          },
        }),
      ).toBe(2);
    } finally {
      await gate.release();
      await Promise.allSettled([pending, ...(reversing ? [reversing] : [])]);
      await gate.close();
    }
  });

  it('makes award wait for held source control and observe its committed revocation', async () => {
    const userId = await subject(),
      sourceId = randomUUID();
    const event = award(userId, sourceId),
      withdrawal = control(sourceId);
    const gate = await holdInsert('community_point_revoked_sources', sourceId);
    const reversing = points.consume(withdrawal);
    let pending: ReturnType<CommunityPointsService['consume']> | undefined;
    try {
      const controlPid = await blockedBy(gate.pid);
      pending = points.consume(event);
      expect(await blockedBy(controlPid)).not.toBe(controlPid);
      await gate.release();
      const [reversed, awarded] = await Promise.all([reversing, pending]);
      expect(reversed).toEqual({ status: 'AWARDED', entry: null });
      expect(awarded).toEqual({ status: 'IGNORED', entry: null });
      expect(await points.balance(userId)).toBe(0);
      expect(
        await fixture.prisma.communityPointEntry.count({ where: { userId } }),
      ).toBe(0);
      expect(
        await fixture.prisma.processedEvent.count({
          where: {
            eventId: event.eventId,
            consumerName: 'dss.api.community-points',
          },
        }),
      ).toBe(1);
    } finally {
      await gate.release();
      await Promise.allSettled([reversing, ...(pending ? [pending] : [])]);
      await gate.close();
    }
  });

  it('allows a different source for the same user to finish while the first source is held', async () => {
    const userId = await subject(),
      sourceId = randomUUID();
    const gate = await holdInsert('community_point_entries', sourceId);
    let finished = false;
    const pending = points.consume(award(userId, sourceId)).then((result) => {
      finished = true;
      return result;
    });
    try {
      await blockedBy(gate.pid);
      const independent = await points.consume(award(userId, randomUUID()));
      expect(independent.status).toBe('AWARDED');
      expect(finished).toBe(false);
      expect(await points.balance(userId)).toBe(10);
      await gate.release();
      expect((await pending).status).toBe('AWARDED');
      expect(await points.balance(userId)).toBe(20);
    } finally {
      await gate.release();
      await Promise.allSettled([pending]);
      await gate.close();
    }
  });

  it('preserves source-less awards and same-event idempotency', async () => {
    const userId = await subject(),
      event = award(userId);
    const results = await Promise.all([
      points.consume(event),
      points.consume(event),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual([
      'AWARDED',
      'DUPLICATE',
    ]);
    const entry = await fixture.prisma.communityPointEntry.findUniqueOrThrow({
      where: { sourceEventId: event.eventId },
    });
    expect(entry.sourceType).toBeNull();
    expect(entry.sourceId).toBeNull();
    expect(await points.balance(userId)).toBe(10);
  });

  for (const boundary of ['Audit', 'Outbox'] as const) {
    it(`rolls back ledger/marker/evidence and releases the source guard after ${boundary} failure`, async () => {
      const userId = await subject(),
        sourceId = randomUUID(),
        event = award(userId, sourceId);
      const failure = new Error(`synthetic Points ${boundary} failure`);
      if (boundary === 'Audit')
        jest.spyOn(audit, 'append').mockRejectedValueOnce(failure);
      else jest.spyOn(outbox, 'append').mockRejectedValueOnce(failure);
      await expect(points.consume(event)).rejects.toBe(failure);
      expect(
        await fixture.prisma.communityPointEntry.count({ where: { userId } }),
      ).toBe(0);
      expect(
        await fixture.prisma.processedEvent.count({
          where: {
            eventId: event.eventId,
            consumerName: 'dss.api.community-points',
          },
        }),
      ).toBe(0);
      expect(
        await fixture.prisma.auditRecord.count({
          where: { metadata: { path: ['userId'], equals: userId } },
        }),
      ).toBe(0);
      expect(
        await fixture.prisma.outboxEvent.count({
          where: {
            payload: { path: ['userId'], equals: userId },
            producer: 'dss.api.community-points',
          },
        }),
      ).toBe(0);
      expect(await points.consume(control(sourceId))).toEqual({
        status: 'AWARDED',
        entry: null,
      });
      expect(await points.consume(award(userId, sourceId))).toEqual({
        status: 'IGNORED',
        entry: null,
      });
    });
  }
});

// Awards and withdrawals now queue at the same source door. Nobody needs a time machine.
