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
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
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
  beforeEach(async () => {
    fixture = await createIsolatedApiSchemaFixture();
  }, 60000);
  afterEach(async () => {
    await fixture?.close();
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
