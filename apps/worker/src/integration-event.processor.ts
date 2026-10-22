import type { Job } from "bullmq";
import {
  IdempotentIntegrationEventProcessor,
  type IntegrationEventHandler,
  type IntegrationEventJob,
  type ProcessedEventStore,
} from "@dss/jobs";
import { INTEGRATION_EVENT_CONSUMER_NAME } from "./integration-event-consumer.js";

export function createIntegrationEventProcessor(
  store: ProcessedEventStore,
  handler: IntegrationEventHandler = async () => undefined,
  consumerName = INTEGRATION_EVENT_CONSUMER_NAME,
): (
  job: Job<IntegrationEventJob>,
) => Promise<{ eventId: string; duplicate: boolean }> {
  const processor = new IdempotentIntegrationEventProcessor(
    consumerName,
    store,
    handler,
  );
  return (job) => processor.process(job.data);
}
