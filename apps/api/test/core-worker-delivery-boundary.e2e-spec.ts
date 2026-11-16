/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Worker Boundary Tests
 * 📄 File: apps/api/test/core-worker-delivery-boundary.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies durable event mapping and actual Worker projection/marker replay.
 *
 * 🧠 Responsibilities:
 * • uses full migrations and a new owned schema for every case;
 * • verifies real PostgreSQL effects across the Core/Worker process boundary;
 * • distinguishes queue capture from delivery, projection from viewer access.
 *
 * 🏗️ Architecture:
 * Test-only ESM bridge; production components and SQL are not copied or patched.
 *
 * ⚠️ Important:
 * No live Redis/SMTP claim, exactly-once promise, consumer rename or domain correction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import type { IntegrationEventJob } from '@dss/jobs';
import { createEventEnvelope, OutboxWriterService } from '../src/core/events';
import { OutboxDispatcherService } from '../src/core/queue/services/outbox-dispatcher.service';
import type { QueueRegistryService } from '../src/core/queue/services/queue-registry.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type ProbeResult = {
  outcomes: (
    | { ok: true; result: { eventId: string; duplicate: boolean } }
    | { ok: false }
  )[];
  handlerCalls: number;
  queued: {
    name: string;
    data: { event: IntegrationEventJob };
    options: { jobId: string };
  }[];
};

describe('Core to Worker actual persistence boundary (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let controls: Pool;
  beforeEach(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    controls = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
  }, 60000);
  afterEach(async () => {
    try {
      await controls?.end();
    } finally {
      await fixture?.close();
    }
  });

  async function dispatch(
    name: string,
    payload: Record<string, string | boolean>,
    aggregateType = 'UserWallPost',
    aggregateId: string = randomUUID(),
  ) {
    const envelope = createEventEnvelope({
      name,
      payload,
      version: 1,
      category: 'integration',
      producer: 'dss.test.boundary',
      aggregate: { type: aggregateType, id: aggregateId },
      actorId: randomUUID(),
      correlationId: randomUUID(),
      causationId: randomUUID(),
      occurredAt: '2026-10-21T00:00:00.000Z',
      metadata: { fixture: 'synthetic' },
    });
    await fixture.prisma.$transaction((tx) =>
      new OutboxWriterService().append(tx, envelope),
    );
    const captured: IntegrationEventJob[] = [];
    const add = jest.fn((_name: string, event: IntegrationEventJob) => {
      captured.push(event);
      return Promise.resolve({ id: event.eventId });
    });
    const dispatcher = new OutboxDispatcherService(fixture.prisma, {
      integrationEvents: { add },
    } as unknown as QueueRegistryService);
    expect(await dispatcher.dispatchPending()).toBe(1);
    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(
      'dispatch-integration-event.v1',
      expect.any(Object),
      {
        jobId: envelope.id,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
    const [event] = captured;
    expect(event).toEqual({
      eventId: envelope.id,
      eventName: name,
      eventVersion: 1,
      category: 'integration',
      producer: envelope.producer,
      payload,
      metadata: envelope.metadata,
      aggregateType,
      aggregateId: envelope.aggregate?.id,
      actorId: envelope.actorId,
      occurredAt: envelope.occurredAt,
      correlationId: envelope.correlationId,
      causationId: envelope.causationId,
    });
    expect(
      await fixture.prisma.outboxEvent.findUniqueOrThrow({
        where: { id: event.eventId },
      }),
    ).toMatchObject({ status: 'PUBLISHED', lockedBy: null, lockedAt: null });
    return event;
  }
  function probe(
    event: IntegrationEventJob,
    mode = 'normal',
  ): Promise<ProbeResult> {
    return new Promise((resolveProbe, rejectProbe) => {
      const child = execFile(
        process.execPath,
        [
          '--import',
          pathToFileURL(
            require.resolve('tsx', {
              paths: [resolve(__dirname, '../../worker')],
            }),
          ).href,
          resolve(__dirname, 'helpers/integration-worker-probe.mjs'),
        ],
        (error, stdout) => {
          if (error) {
            rejectProbe(new Error('Native integration Worker probe failed'));
            return;
          }
          try {
            resolveProbe(JSON.parse(stdout) as ProbeResult);
          } catch {
            rejectProbe(new Error('Invalid integration Worker probe result'));
          }
        },
      );
      child.stdin?.end(
        JSON.stringify({
          connectionString: process.env.DATABASE_URL,
          schema: fixture.schema,
          event,
          mode,
        }),
      );
    });
  }
  async function assertMarker(event: IntegrationEventJob) {
    expect(await fixture.prisma.processedEvent.findMany()).toMatchObject([
      {
        eventId: event.eventId,
        eventName: event.eventName,
        eventVersion: 1,
        consumerName: 'dss.worker.integration-events.v1',
      },
    ]);
  }
  it('maps a durable Wall event into one minimal Activity row and marker', async () => {
    const event = await dispatch('users.profile-wall.post-created.v1', {
      profileOwnerId: randomUUID(),
      hasImage: true,
      body: 'synthetic-private-body',
      passwordHash: 'synthetic-private-hash',
    });
    expect(await probe(event)).toMatchObject({
      handlerCalls: 1,
      outcomes: [{ ok: true, result: { duplicate: false } }],
    });
    expect(await fixture.prisma.activityEntry.findMany()).toMatchObject([
      {
        sourceEventId: event.eventId,
        actorId: event.actorId,
        subjectId: event.aggregateId,
        action: 'PROFILE_WALL_POST_CREATED',
        visibility: 'MEMBERS',
        metadata: {
          profileOwnerId: (event.payload as { profileOwnerId: string })
            .profileOwnerId,
          hasImage: true,
        },
      },
    ]);
    const entry = await fixture.prisma.activityEntry.findUniqueOrThrow({
      where: { sourceEventId: event.eventId },
    });
    expect(Object.keys(entry.metadata as object).sort()).toEqual([
      'hasImage',
      'profileOwnerId',
    ]);
    expect(JSON.stringify(entry)).not.toContain('synthetic-private');
    await assertMarker(event);
    expect(await fixture.prisma.user.count()).toBe(0);
  });
  it.each(['PUBLIC', 'MEMBERS'])(
    'projects only supported News metadata with %s visibility',
    async (visibility) => {
      const event = await dispatch(
        'news.article.published.v1',
        {
          authorId: randomUUID(),
          language: 'en',
          slug: 'synthetic-news',
          title: 'Synthetic news',
          visibility,
          categorySlug: 'engineering',
          tags: 'one,two',
          body: 'synthetic-private-document',
        },
        'NewsArticle',
      );
      expect((await probe(event)).outcomes).toEqual([
        { ok: true, result: { eventId: event.eventId, duplicate: false } },
      ]);
      const row = await fixture.prisma.activityEntry.findUniqueOrThrow({
        where: { sourceEventId: event.eventId },
      });
      expect(row).toMatchObject({
        visibility,
        actorId: (event.payload as { authorId: string }).authorId,
        metadata: {
          language: 'en',
          slug: 'synthetic-news',
          title: 'Synthetic news',
          categorySlug: 'engineering',
          tags: 'one,two',
        },
      });
      expect(Object.keys(row.metadata as object).sort()).toEqual([
        'categorySlug',
        'language',
        'slug',
        'tags',
        'title',
      ]);
      expect(JSON.stringify(row)).not.toContain('synthetic-private-document');
      await assertMarker(event);
    },
  );
  it('replays after real marker INSERT failure without duplicating the committed Activity row', async () => {
    const event = await dispatch('users.profile-wall.post-created.v1', {
      profileOwnerId: randomUUID(),
    });
    await fixture.prisma.$executeRawUnsafe(
      `CREATE FUNCTION "${fixture.schema}".fail_marker() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic marker failure'; END $$`,
    );
    await fixture.prisma.$executeRawUnsafe(
      `CREATE TRIGGER fail_marker BEFORE INSERT ON "${fixture.schema}".processed_events FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".fail_marker()`,
    );
    expect((await probe(event)).outcomes).toEqual([{ ok: false }]);
    const original = await fixture.prisma.activityEntry.findUniqueOrThrow({
      where: { sourceEventId: event.eventId },
    });
    expect(await fixture.prisma.processedEvent.count()).toBe(0);
    await fixture.prisma.$executeRawUnsafe(
      `DROP TRIGGER fail_marker ON "${fixture.schema}".processed_events`,
    );
    await fixture.prisma.$executeRawUnsafe(
      `DROP FUNCTION "${fixture.schema}".fail_marker()`,
    );
    expect((await probe(event)).outcomes).toEqual([
      { ok: true, result: { eventId: event.eventId, duplicate: false } },
    ]);
    expect(await fixture.prisma.activityEntry.findMany()).toEqual([original]);
    await assertMarker(event);
    expect(await probe(event)).toMatchObject({
      handlerCalls: 0,
      outcomes: [{ ok: true, result: { duplicate: true } }],
    });
  });
  it('preserves one projection and marker across two concurrent deliveries', async () => {
    const event = await dispatch('users.profile-wall.post-created.v1', {
      profileOwnerId: randomUUID(),
    });
    const result = await probe(event, 'parallel');
    expect(result.outcomes).toHaveLength(2);
    expect(result.outcomes.every((outcome) => outcome.ok)).toBe(true);
    expect(await fixture.prisma.activityEntry.count()).toBe(1);
    await assertMarker(event);
  });
  it('acknowledges an unrelated private event without creating Activity', async () => {
    const event = await dispatch(
      'interactions.bookmark.saved.v1',
      { ownerId: randomUUID(), body: 'synthetic-private-bookmark' },
      'Bookmark',
    );
    expect((await probe(event)).outcomes).toEqual([
      { ok: true, result: { eventId: event.eventId, duplicate: false } },
    ]);
    expect(await fixture.prisma.activityEntry.count()).toBe(0);
    await assertMarker(event);
  });
  it('retracts an existing Wall projection through the same real consumer path', async () => {
    const created = await dispatch('users.profile-wall.post-created.v1', {
      profileOwnerId: randomUUID(),
    });
    expect((await probe(created)).outcomes[0].ok).toBe(true);
    const retracted = await dispatch(
      'users.profile-wall.post-retracted.v1',
      {},
      'UserWallPost',
      created.aggregateId,
    );
    expect((await probe(retracted)).outcomes[0].ok).toBe(true);
    const row = await fixture.prisma.activityEntry.findUniqueOrThrow({
      where: { sourceEventId: created.eventId },
    });
    expect(row.retractedAt).toEqual(new Date(retracted.occurredAt));
    expect((await probe(retracted)).outcomes).toEqual([
      { ok: true, result: { eventId: retracted.eventId, duplicate: true } },
    ]);
    expect(await fixture.prisma.activityEntry.findMany()).toEqual([row]);
    expect(await fixture.prisma.processedEvent.count()).toBe(2);
  });
  it('preserves a retraction received before creation, including replay and independent sources', async () => {
    const created = await dispatch('users.profile-wall.post-created.v1', {
      profileOwnerId: randomUUID(),
    });
    const retracted = await dispatch(
      'users.profile-wall.post-retracted.v1',
      {},
      'UserWallPost',
      created.aggregateId,
    );
    expect((await probe(retracted)).outcomes[0].ok).toBe(true);
    expect(await fixture.prisma.activityEntry.count()).toBe(0);
    expect((await probe(created)).outcomes[0].ok).toBe(true);
    expect((await probe(created)).outcomes[0]).toMatchObject({
      ok: true,
      result: { duplicate: true },
    });
    const replacement = { ...created, eventId: randomUUID() };
    expect((await probe(replacement)).outcomes[0].ok).toBe(true);
    expect(
      await fixture.prisma.activityEntry.count({
        where: { retractedAt: null },
      }),
    ).toBe(0);
    const other = await dispatch('users.profile-wall.post-created.v1', {});
    expect((await probe(other)).outcomes[0].ok).toBe(true);
    expect(
      await fixture.prisma.activityEntry.count({
        where: { retractedAt: null },
      }),
    ).toBe(1);
    expect(await fixture.prisma.activityEntry.count()).toBe(3);
  });

  for (const first of ['create', 'retract'] as const) {
    it(`serializes ${first}-first concurrent delivery under the same source lock`, async () => {
      const created = await dispatch('users.profile-wall.post-created.v1', {});
      const retracted = await dispatch(
        'users.profile-wall.post-retracted.v1',
        {},
        'UserWallPost',
        created.aggregateId,
      );
      const table =
        first === 'create' ? 'activity_entries' : 'activity_retractions';
      const coordinate = `activity-test:${randomUUID()}`;
      if (
        !/^api_boundary_[a-f0-9]{32}$/.test(fixture.schema) ||
        !/^[a-f0-9-]{36}$/.test(created.aggregateId!)
      )
        throw new Error('Unsafe test identifiers');
      await controls.query(`CREATE FUNCTION "${fixture.schema}".hold_activity() RETURNS trigger LANGUAGE plpgsql AS $body$
        BEGIN IF NEW."subjectId" = '${created.aggregateId}' THEN
        PERFORM pg_advisory_xact_lock(hashtextextended('${coordinate}',0)); END IF; RETURN NEW; END $body$`);
      await controls.query(
        `CREATE TRIGGER hold_activity BEFORE INSERT ON "${fixture.schema}"."${table}" FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".hold_activity()`,
      );
      const holder = await controls.connect();
      const inFlight: Promise<ProbeResult>[] = [];
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
        async function blockedBy(pid: number) {
          const deadline = performance.now() + 2000;
          do {
            const { rows } = await controls.query<{ pid: number }>(
              "SELECT pid FROM pg_stat_activity WHERE application_name=$1 AND state='active' AND $2::int=ANY(pg_blocking_pids(pid))",
              [fixture.schema, pid],
            );
            if (rows[0]) return rows[0].pid;
          } while (performance.now() < deadline);
          throw new Error('Expected physical Activity lock contention');
        }
        inFlight.push(probe(first === 'create' ? created : retracted));
        const winner = await blockedBy(owner.pid);
        inFlight.push(probe(first === 'create' ? retracted : created));
        await blockedBy(winner);
        await holder.query('ROLLBACK');
        const results = await Promise.all(inFlight);
        expect(results.map((result) => result.outcomes[0].ok)).toEqual([
          true,
          true,
        ]);
        const entry = await fixture.prisma.activityEntry.findUniqueOrThrow({
          where: { sourceEventId: created.eventId },
        });
        expect(entry.retractedAt).toEqual(new Date(retracted.occurredAt));
        expect(
          await fixture.prisma.activityEntry.count({
            where: { retractedAt: null },
          }),
        ).toBe(0);
      } finally {
        await holder.query('ROLLBACK');
        holder.release();
        await Promise.allSettled(inFlight);
      }
    });
  }

  it('rolls back deletion evidence on projection failure and permits an exact retry', async () => {
    const created = await dispatch('users.profile-wall.post-created.v1', {});
    expect((await probe(created)).outcomes[0].ok).toBe(true);
    const retracted = await dispatch(
      'users.profile-wall.post-retracted.v1',
      {},
      'UserWallPost',
      created.aggregateId,
    );
    await controls.query(
      `CREATE FUNCTION "${fixture.schema}".fail_activity_update() RETURNS trigger LANGUAGE plpgsql AS $body$ BEGIN RAISE EXCEPTION 'synthetic update failure'; END $body$`,
    );
    await controls.query(
      `CREATE TRIGGER fail_activity_update BEFORE UPDATE ON "${fixture.schema}"."activity_entries" FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".fail_activity_update()`,
    );
    expect((await probe(retracted)).outcomes).toEqual([{ ok: false }]);
    const {
      rows: [row],
    } = await controls.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM "activity_retractions"',
    );
    expect(row.count).toBe('0');
    expect(
      await fixture.prisma.processedEvent.count({
        where: { eventId: retracted.eventId },
      }),
    ).toBe(0);
    expect(
      await fixture.prisma.activityEntry.count({
        where: { retractedAt: null },
      }),
    ).toBe(1);
    await controls.query(
      `DROP TRIGGER fail_activity_update ON "${fixture.schema}"."activity_entries"`,
    );
    expect((await probe(retracted)).outcomes[0].ok).toBe(true);
    expect(
      await fixture.prisma.activityEntry.count({
        where: { retractedAt: null },
      }),
    ).toBe(0);
  });

  it('backfills only known Wall retractions when upgrading the existing projection', async () => {
    const created = await dispatch('users.profile-wall.post-created.v1', {});
    expect((await probe(created)).outcomes[0].ok).toBe(true);
    const retractedAt = new Date('2026-10-21T01:00:00.000Z');
    await fixture.prisma.activityEntry.update({
      where: { sourceEventId: created.eventId },
      data: { retractedAt },
    });
    await controls.query('DROP TABLE "activity_retractions"');
    const migration = await readFile(
      resolve(
        __dirname,
        '../prisma/migrations/20261115170000_preserve_activity_retractions/migration.sql',
      ),
      'utf8',
    );
    await controls.query(migration);
    const { rows } = await controls.query<{
      subjectType: string;
      subjectId: string;
      retractedAt: Date;
    }>(
      'SELECT "subjectType", "subjectId", "retractedAt" AT TIME ZONE \'UTC\' AS "retractedAt" FROM "activity_retractions"',
    );
    expect(rows).toEqual([
      {
        subjectType: 'UserWallPost',
        subjectId: created.aggregateId,
        retractedAt,
      },
    ]);
    expect(
      (await probe({ ...created, eventId: randomUUID() })).outcomes[0].ok,
    ).toBe(true);
    expect(
      await fixture.prisma.activityEntry.count({
        where: { retractedAt: null },
      }),
    ).toBe(0);
  });

  it('leaves failed projection unmarked and retains the actual DLQ envelope separately', async () => {
    const event = await dispatch(
      'news.article.published.v1',
      { body: 'synthetic-private-invalid' },
      'NewsArticle',
    );
    const result = await probe(event, 'dead-letter');
    expect(result.outcomes).toEqual([{ ok: false }]);
    expect(await fixture.prisma.activityEntry.count()).toBe(0);
    expect(await fixture.prisma.processedEvent.count()).toBe(0);
    expect(await fixture.prisma.deadLetterEvent.findMany()).toMatchObject([
      {
        eventId: event.eventId,
        sourceJobId: event.eventId,
        consumerName: 'dss.worker.integration-events.v2',
        attempts: 5,
        payload: event,
        reason: 'Published News activity metadata is incomplete.',
      },
    ]);
    expect(result.queued).toMatchObject([
      {
        name: 'dead-letter-integration-event.v1',
        data: { event },
        options: {
          jobId: `${event.eventId}-dss.worker.integration-events.v2`,
          removeOnComplete: false,
          removeOnFail: false,
        },
      },
    ]);
  });
});
