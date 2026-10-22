/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Worker Identity Boundary Tests
 * 📄 File: apps/api/test/consumer-identity-boundary.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies historical markers, DLQ identity and current retry with real DB/Redis.
 *
 * 🏗️ Architecture:
 * Isolated migrated schemas and unique queue prefixes; native Worker ESM bridge.
 *
 * ⚠️ Important:
 * No shared queue purge, historical rewrite or exactly-once claim.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Queue, QueueEvents, Worker } from 'bullmq';
import {
  DSS_QUEUE_NAMES,
  type IntegrationEventJob,
  type DeadLetterIntegrationEventJob,
} from '@dss/jobs';
import { QueueOperationsService } from '../src/core/queue/services/queue-operations.service';
import type { QueueRegistryService } from '../src/core/queue/services/queue-registry.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type Probe = {
  consumer?: string;
  result?: { eventId: string; duplicate: boolean };
  handlerCalls?: number;
};
const canonical = 'dss.worker.integration-events.v1';
const historical = 'dss.worker.integration-events.v2';

describe('Worker consumer identity compatibility (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let queue: Queue<IntegrationEventJob>;
  let dlq: Queue<DeadLetterIntegrationEventJob>;
  let events: QueueEvents;
  let worker: Worker | undefined;
  let prefix: string;
  const redisPort = Number(process.env.REDIS_PORT ?? 6380);
  const connection = { host: '127.0.0.1', port: redisPort };

  beforeEach(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    prefix = `dss-debt061-${randomUUID().replaceAll('-', '')}`;
    queue = new Queue(DSS_QUEUE_NAMES.INTEGRATION_EVENTS, {
      connection,
      prefix,
    });
    dlq = new Queue(DSS_QUEUE_NAMES.INTEGRATION_EVENTS_DEAD_LETTER, {
      connection,
      prefix,
    });
    events = new QueueEvents(DSS_QUEUE_NAMES.INTEGRATION_EVENTS, {
      connection,
      prefix,
    });
    await events.waitUntilReady();
  }, 60000);

  afterEach(async () => {
    await worker?.close();
    worker = undefined;
    await events?.close();
    // Only this test's freshly generated prefix can be removed.
    expect(prefix).toMatch(/^dss-debt061-[a-f0-9]{32}$/);
    await queue?.obliterate({ force: true });
    await dlq?.obliterate({ force: true });
    await queue?.close();
    await dlq?.close();
    await fixture?.close();
  });

  function event(): IntegrationEventJob {
    return {
      eventId: randomUUID(),
      eventName: 'test.identity.v1',
      eventVersion: 1,
      category: 'integration',
      producer: 'test',
      payload: {},
      occurredAt: '2026-10-22T00:00:00.000Z',
    };
  }
  function probe(
    data: IntegrationEventJob,
    action: 'process' | 'record',
    legacy = false,
  ): Promise<Probe> {
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
          resolve(__dirname, 'helpers/consumer-identity-worker-probe.mjs'),
        ],
        { timeout: 15000, windowsHide: true },
        (error, stdout) => {
          if (error)
            return rejectProbe(new Error('Isolated identity probe failed'));
          try {
            resolveProbe(JSON.parse(stdout) as Probe);
          } catch {
            rejectProbe(new Error('Invalid identity probe output'));
          }
        },
      );
      child.stdin?.end(
        JSON.stringify({
          connectionString: process.env.DATABASE_URL,
          schema: fixture.schema,
          prefix,
          redisPort,
          event: data,
          action,
          legacy,
        }),
      );
    });
  }

  it('new markers and actual DLQ jobs agree on canonical v1', async () => {
    const processed = event();
    const failed = event();
    expect(await probe(processed, 'process')).toMatchObject({
      handlerCalls: 1,
      result: { duplicate: false },
    });
    expect(await probe(failed, 'record')).toEqual({ consumer: canonical });
    expect(await fixture.prisma.processedEvent.findMany()).toMatchObject([
      { eventId: processed.eventId, consumerName: canonical },
    ]);
    expect(await fixture.prisma.deadLetterEvent.findMany()).toMatchObject([
      { eventId: failed.eventId, consumerName: canonical },
    ]);
    expect(
      (await dlq.getJob(`${failed.eventId}-${canonical}`))?.data.event.eventId,
    ).toBe(failed.eventId);
  }, 30000);

  it.each([false, true])(
    'current retry preserves old v2 DLQ history (already processed: %s)',
    async (alreadyProcessed) => {
      const data = event();
      if (alreadyProcessed)
        await fixture.prisma.processedEvent.create({
          data: {
            eventId: data.eventId,
            eventName: data.eventName,
            eventVersion: 1,
            consumerName: canonical,
          },
        });
      await probe(data, 'record', true);
      const before = await fixture.prisma.deadLetterEvent.findFirstOrThrow();
      let fail = true;
      let handlerCalls = 0;
      worker = new Worker<IntegrationEventJob>(
        DSS_QUEUE_NAMES.INTEGRATION_EVENTS,
        async (job) => {
          if (fail) throw new Error('synthetic initial failure');
          const outcome = await probe(job.data, 'process');
          handlerCalls += outcome.handlerCalls ?? 0;
          return outcome.result;
        },
        { connection, prefix },
      );
      await worker.waitUntilReady();
      const job = await queue.add('identity-control', data, {
        jobId: data.eventId,
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      });
      await expect(job.waitUntilFinished(events, 15000)).rejects.toThrow(
        'synthetic initial failure',
      );
      fail = false;
      const operations = new QueueOperationsService(
        { integrationEvents: queue } as unknown as QueueRegistryService,
        fixture.prisma,
      );
      await operations.retryFailed(data.eventId);
      await expect(job.waitUntilFinished(events, 15000)).resolves.toEqual({
        eventId: data.eventId,
        duplicate: alreadyProcessed,
      });
      expect(handlerCalls).toBe(alreadyProcessed ? 0 : 1);
      const { resolvedAt, ...after } =
        await fixture.prisma.deadLetterEvent.findFirstOrThrow();
      const { resolvedAt: previousResolution, ...original } = before;
      expect(previousResolution).toBeNull();
      expect(resolvedAt).toBeInstanceOf(Date);
      expect(after).toEqual(original);
      expect(after.consumerName).toBe(historical);
      expect(await dlq.getJob(`${data.eventId}-${historical}`)).toBeDefined();
      expect(await fixture.prisma.processedEvent.findMany()).toMatchObject([
        { eventId: data.eventId, consumerName: canonical },
      ]);
      expect(await fixture.prisma.processedEvent.count()).toBe(1);
    },
    30000,
  );
});
