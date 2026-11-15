/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Community Points Writer Characterization
 * 📄 File: apps/api/test/community-points-source-order.characterization.e2e-spec.ts
 * 🎯 Purpose: Observes actual award/source-control ordering before shared synchronization.
 * 🧠 Responsibilities: Compares sequential controls with a physical INSERT barrier.
 * 🏗️ Architecture: Real owner writers, Audit/Outbox and an isolated fully migrated schema.
 * ⚠️ Important: Synthetic events/profiles do not prove producer admission, HTTP or login.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import type { IntegrationEventJob } from '@dss/jobs';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import { CommunityPointsService } from '../src/modules/community-points/application/services/community-points.service';
import { PrismaCommunityPointsRepository } from '../src/modules/community-points/infrastructure/repositories/prisma-community-points.repository';
import { PrismaProfileExistenceReader } from '../src/modules/users/infrastructure/repositories/prisma-profile-existence.reader';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Points award/source ordering (characterization)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let controls: Pool;
  let points: CommunityPointsService;
  const eventName = `audit.points.source.${randomUUID()}.v1`;

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    controls = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
    points = new CommunityPointsService(
      new PrismaCommunityPointsRepository(
        fixture.prisma,
        new AuditWriterService(new AuditRedactionService()),
        new OutboxWriterService(),
      ),
      new PrismaProfileExistenceReader(fixture.prisma),
    );
    await fixture.prisma.communityPointRule.create({
      data: { key: eventName, eventName, points: 10, dailyLimit: null },
    });
  }, 60000);

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

  function award(userId: string, sourceId: string): IntegrationEventJob {
    return {
      eventId: randomUUID(),
      eventName,
      eventVersion: 1,
      category: 'integration',
      producer: 'audit.synthetic',
      aggregateType: 'ReputationEntry',
      aggregateId: sourceId,
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

  it('reverses an already committed award in the sequential control', async () => {
    const userId = await subject(),
      sourceId = randomUUID();
    const awarded = await points.consume(award(userId, sourceId));
    expect(awarded.status).toBe('AWARDED');
    expect(awarded.entry?.points).toBe(10);
    const reversed = await points.consume(control(sourceId));
    expect(reversed.status).toBe('AWARDED');
    expect(reversed.entry?.points).toBe(-10);
    if (!reversed.entry) throw new Error('Expected actual reversal entry.');
    const compensation =
      await fixture.prisma.communityPointEntry.findUniqueOrThrow({
        where: { id: reversed.entry.id },
      });
    expect(compensation.reversesEntryId).toBe(awarded.entry?.id);
    expect(await points.balance(userId)).toBe(0);
  });

  it('suppresses later events for the same revoked legacy source key', async () => {
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

  it('currently commits an unreversed award when source control passes a held INSERT', async () => {
    const userId = await subject(),
      sourceId = randomUUID();
    const event = award(userId, sourceId),
      withdrawal = control(sourceId);
    const coordinate = `audit.points.insert.${randomUUID()}`;
    // Only generated UUIDs and a fixture-owned schema enter this test-only DDL.
    if (
      !/^api_boundary_[a-f0-9]{32}$/.test(fixture.schema) ||
      !/^[a-f0-9-]{36}$/.test(sourceId)
    )
      throw new Error('Unexpected synthetic fixture identifiers.');
    await controls.query(`CREATE FUNCTION "${fixture.schema}".hold_points_insert() RETURNS trigger LANGUAGE plpgsql AS $body$
      BEGIN
        IF NEW."sourceId" = '${sourceId}' AND NEW."reversesEntryId" IS NULL THEN
          PERFORM pg_advisory_xact_lock(hashtextextended('${coordinate}', 0));
        END IF;
        RETURN NEW;
      END $body$`);
    await controls.query(
      `CREATE TRIGGER hold_points_insert BEFORE INSERT ON "${fixture.schema}".community_point_entries FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".hold_points_insert()`,
    );
    const holder = await controls.connect();
    let pending: ReturnType<CommunityPointsService['consume']> | undefined;
    try {
      await holder.query('BEGIN');
      await holder.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
        [coordinate],
      );
      const {
        rows: [owner],
      } = await holder.query<{ pid: number }>(
        'SELECT pg_backend_pid()::int AS pid',
      );
      pending = points.consume(event);
      const deadline = performance.now() + 2000;
      let waiter = 0;
      do {
        const { rows } = await controls.query<{ pid: number }>(
          "SELECT pid FROM pg_stat_activity WHERE state='active' AND $1::int=ANY(pg_blocking_pids(pid))",
          [owner.pid],
        );
        if (rows[0]) {
          waiter = rows[0].pid;
          break;
        }
      } while (performance.now() < deadline);
      expect(waiter).toBeGreaterThan(0);
      expect(waiter).not.toBe(owner.pid);
      // The production award has passed its real revoked-source read but has not inserted.
      expect(await points.consume(withdrawal)).toEqual({
        status: 'AWARDED',
        entry: null,
      });
      expect(
        await fixture.prisma.communityPointRevokedSource.count({
          where: {
            sourceType: 'ReputationEntry',
            sourceId,
            sourceEventId: withdrawal.eventId,
          },
        }),
      ).toBe(1);
      await holder.query('COMMIT');
      const result = await pending;
      expect(result.status).toBe('AWARDED');
      expect(result.entry?.points).toBe(10);
      const original =
        await fixture.prisma.communityPointEntry.findUniqueOrThrow({
          where: { sourceEventId: event.eventId },
          include: { reversal: true },
        });
      expect(original.reversal).toBeNull();
      expect(await points.balance(userId)).toBe(10);
      expect(await points.consume(withdrawal)).toEqual({
        status: 'DUPLICATE',
        entry: null,
      });
      expect(await points.balance(userId)).toBe(10);
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
          where: { targetId: original.id, action: 'community-points.awarded' },
        }),
      ).toBe(1);
      expect(
        await fixture.prisma.outboxEvent.count({
          where: {
            aggregateId: original.id,
            eventName: 'community-points.awarded.v1',
          },
        }),
      ).toBe(1);
    } finally {
      try {
        await holder.query('ROLLBACK');
      } finally {
        holder.release();
      }
      if (pending) await Promise.allSettled([pending]);
      await controls.query(
        `DROP TRIGGER hold_points_insert ON "${fixture.schema}".community_point_entries`,
      );
      await controls.query(
        `DROP FUNCTION "${fixture.schema}".hold_points_insert()`,
      );
    }
  });
});

// A completed control is not a time machine for an INSERT still waiting at the door.
