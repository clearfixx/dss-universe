/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Worker Identity Test Infrastructure
 * 📄 File: apps/api/test/helpers/consumer-identity-worker-probe.mjs
 *
 * 🎯 Purpose:
 * Exercises real Worker marker and DLQ adapters in an owned migrated schema.
 *
 * 🏗️ Architecture:
 * Native ESM/tsx test bridge; never imports main or starts background consumers.
 *
 * ⚠️ Important:
 * Only disposable loopback endpoints and uniquely prefixed fixture queues.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Pool } from 'pg';
import { Queue } from 'bullmq';
import { DSS_QUEUE_NAMES } from '@dss/jobs';
import { INTEGRATION_EVENT_CONSUMER_NAME } from '../../../worker/src/integration-event-consumer.ts';
import { createIntegrationEventProcessor } from '../../../worker/src/integration-event.processor.ts';
import { PostgresProcessedEventStore } from '../../../worker/src/processed-event.store.ts';
import { DeadLetterService } from '../../../worker/src/dead-letter.service.ts';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const { connectionString, schema, prefix, redisPort, event, action, legacy } =
  JSON.parse(input);
const url = new URL(connectionString);
if (
  !/^api_boundary_[a-f0-9]{32}$/.test(schema) ||
  !/^dss-debt061-[a-f0-9]{32}$/.test(prefix) ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
  url.pathname !== '/dss_test' ||
  url.username !== 'dss_test' ||
  !Number.isInteger(redisPort) ||
  redisPort < 1 ||
  redisPort > 65535 ||
  !['process', 'record'].includes(action)
)
  throw new Error('Invalid isolated consumer identity fixture.');

const pool = new Pool({
  connectionString,
  options: `-c search_path=${schema},public`,
});
let queue;
try {
  if (action === 'record') {
    queue = new Queue(DSS_QUEUE_NAMES.INTEGRATION_EVENTS_DEAD_LETTER, {
      connection: { host: '127.0.0.1', port: redisPort },
      prefix,
    });
    const consumer = legacy
      ? 'dss.worker.integration-events.v2'
      : INTEGRATION_EVENT_CONSUMER_NAME;
    await new DeadLetterService(pool, queue, consumer).record({
      event,
      sourceJobId: event.eventId,
      reason: 'synthetic identity fixture',
      attempts: 1,
      failedAt: '2026-10-22T00:00:00.000Z',
    });
    process.stdout.write(JSON.stringify({ consumer }));
  } else {
    let handlerCalls = 0;
    const consume = createIntegrationEventProcessor(
      new PostgresProcessedEventStore(pool),
      async () => {
        handlerCalls++;
      },
    );
    const result = await consume({ data: event });
    process.stdout.write(JSON.stringify({ result, handlerCalls }));
  }
} finally {
  await queue?.close();
  await pool.end();
}
