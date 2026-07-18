import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { Pool } from "pg";
import pino from "pino";
import {
  DSS_QUEUE_NAMES,
  type DeadLetterIntegrationEventJob,
  type IntegrationEventJob,
} from "@dss/jobs";
import { DeadLetterService } from "./dead-letter.service.js";
import { createIntegrationEventProcessor } from "./integration-event.processor.js";
import { PostgresProcessedEventStore } from "./processed-event.store.js";

const connection = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});
const logger = pino({
  name: "dss-worker",
  level: process.env.LOG_LEVEL ?? "info",
});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const consumerName = "dss.worker.integration-events.v1";
const deadLetterQueue = new Queue<DeadLetterIntegrationEventJob>(
  DSS_QUEUE_NAMES.INTEGRATION_EVENTS_DEAD_LETTER,
  { connection },
);
const deadLetters = new DeadLetterService(pool, deadLetterQueue, consumerName);
const worker = new Worker<IntegrationEventJob>(
  DSS_QUEUE_NAMES.INTEGRATION_EVENTS,
  createIntegrationEventProcessor(new PostgresProcessedEventStore(pool)),
  { connection },
);
worker.on("failed", (job, error) => {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
  void deadLetters.record({
    event: job.data,
    ...(job.id ? { sourceJobId: job.id } : {}),
    reason: error.message,
    attempts: job.attemptsMade,
    failedAt: new Date().toISOString(),
  });
  logger.error(
    { jobId: job.id, eventId: job.data.eventId, err: error },
    "Integration event job exhausted retries",
  );
});
worker.on("completed", (job, result) => {
  logger.info(
    { jobId: job.id, eventId: job.data.eventId, duplicate: result.duplicate },
    "Integration event processed",
  );
});

const heartbeat = setInterval(() => {
  void connection.set(
    "dss:worker:integration-events:heartbeat",
    new Date().toISOString(),
    "EX",
    30,
  );
}, 10_000);
heartbeat.unref();

async function shutdown(): Promise<void> {
  clearInterval(heartbeat);
  await worker.close();
  await deadLetterQueue.close();
  await pool.end();
  await connection.quit();
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
