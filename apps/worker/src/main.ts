import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { DSS_QUEUE_NAMES, type IntegrationEventJob } from "@dss/jobs";
import { processIntegrationEvent } from "./integration-event.processor.js";

const connection = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});
const worker = new Worker<IntegrationEventJob>(
  DSS_QUEUE_NAMES.INTEGRATION_EVENTS,
  processIntegrationEvent,
  { connection },
);
worker.on("failed", (job, error) =>
  console.error("Integration event job failed", job?.id, error),
);

async function shutdown(): Promise<void> {
  await worker.close();
  await connection.quit();
}
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
