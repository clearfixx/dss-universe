/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Worker Test Infrastructure
 * 📄 File: apps/api/test/helpers/integration-worker-probe.mjs
 *
 * 🎯 Purpose:
 * Exercises actual Worker source against one parent's migrated owned schema.
 *
 * 🧠 Responsibilities:
 * • receives synthetic event/configuration only through stdin;
 * • runs the real marker store and Activity handler, then closes PostgreSQL;
 * • observes the DLQ queue boundary without contacting Redis or external systems.
 *
 * 🏗️ Architecture:
 * Test-only ESM bridge loaded with the installed tsx runtime; main.ts is not loaded.
 *
 * ⚠️ Important:
 * Never log connection strings or payloads. Queue observations are not live delivery.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Pool } from 'pg';
import { createIntegrationEventProcessor } from '../../../worker/src/integration-event.processor.ts';
import { PostgresProcessedEventStore } from '../../../worker/src/processed-event.store.ts';
import { PostgresActivityProjector } from '../../../worker/src/postgres-activity.projector.ts';
import { DeadLetterService } from '../../../worker/src/dead-letter.service.ts';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const { connectionString, schema, event, mode } = JSON.parse(input);
const url = new URL(connectionString);
if (
  !/^api_boundary_[a-f0-9]{32}$/.test(schema) ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
  url.pathname !== '/dss_test' ||
  url.username !== 'dss_test' ||
  !['normal', 'parallel', 'dead-letter'].includes(mode)
)
  throw new Error('Invalid isolated Worker probe configuration.');

const pool = new Pool({
  connectionString,
  options: `-c search_path=${schema},public`,
  application_name: schema,
});
try {
  const store = new PostgresProcessedEventStore(pool);
  const projector = new PostgresActivityProjector(pool);
  let handlerCalls = 0;
  const consume = createIntegrationEventProcessor(store, (job) => {
    handlerCalls++;
    return projector.project(job);
  });
  const queued = [];
  async function once() {
    try {
      return { ok: true, result: await consume({ data: event }) };
    } catch (error) {
      if (mode === 'dead-letter') {
        const deadLetters = new DeadLetterService(
          pool,
          {
            add: (name, data, options) => {
              queued.push({ name, data, options });
              return Promise.resolve({ id: options.jobId });
            },
          },
          'dss.worker.integration-events.v2',
        );
        await deadLetters.record({
          event,
          sourceJobId: event.eventId,
          reason:
            error instanceof Error ? error.message : 'Unknown fixture failure',
          attempts: 5,
          failedAt: '2026-10-21T00:00:00.000Z',
        });
      }
      return { ok: false };
    }
  }
  const outcomes =
    mode === 'parallel' ? await Promise.all([once(), once()]) : [await once()];
  process.stdout.write(JSON.stringify({ outcomes, handlerCalls, queued }));
} finally {
  await pool.end();
}
