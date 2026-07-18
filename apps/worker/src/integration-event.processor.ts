import type { Job } from "bullmq";
import {
  processIntegrationEvent as processEvent,
  type IntegrationEventJob,
} from "@dss/jobs";

export async function processIntegrationEvent(
  job: Job<IntegrationEventJob>,
): Promise<{ eventId: string }> {
  return processEvent(job.data);
}
