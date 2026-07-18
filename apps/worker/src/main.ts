import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { Pool } from "pg";
import { DSS_QUEUE_NAMES, type DeadLetterIntegrationEventJob,
  type IntegrationEventJob } from "@dss/jobs";
import { DeadLetterService } from "./dead-letter.service.js";
import { createIntegrationEventProcessor } from "./integration-event.processor.js";
import { PostgresProcessedEventStore } from "./processed-event.store.js";

const connection = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
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
});

async function shutdown(): Promise<void> {
  await worker.close();
  await deadLetterQueue.close();
  await pool.end();
  await connection.quit();
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
