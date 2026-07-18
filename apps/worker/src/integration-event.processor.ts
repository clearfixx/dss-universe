import type { Job } from "bullmq";
import { IdempotentIntegrationEventProcessor, type IntegrationEventHandler,
  type IntegrationEventJob, type ProcessedEventStore } from "@dss/jobs";

export function createIntegrationEventProcessor(
  store: ProcessedEventStore,
  handler: IntegrationEventHandler = async () => undefined,
  consumerName = "dss.worker.integration-events.v1",
): (job: Job<IntegrationEventJob>) => Promise<{ eventId: string; duplicate: boolean }> {
  const processor = new IdempotentIntegrationEventProcessor(consumerName, store, handler);
  return (job) => processor.process(job.data);
}
