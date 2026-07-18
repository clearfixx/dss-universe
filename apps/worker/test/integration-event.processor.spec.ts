import { describe, expect, it, vi } from "vitest";
import type { Job } from "bullmq";
import type { IntegrationEventJob, ProcessedEventStore } from "@dss/jobs";
import { createIntegrationEventProcessor } from "../src/integration-event.processor";

describe("processIntegrationEvent", () => {
  it("acknowledges a valid versioned job", async () => {
    const markers = new Set<string>();
    const store: ProcessedEventStore = {
      hasProcessed: async (eventId, consumer) => markers.has(`${eventId}:${consumer}`),
      markProcessed: async (event, consumer) => void markers.add(`${event.eventId}:${consumer}`),
    };
    const handler = vi.fn(async () => undefined);
    const process = createIntegrationEventProcessor(store, handler, "test-consumer");
    const data: IntegrationEventJob = { eventId: "event-1", eventName: "test.created",
      eventVersion: 1, category: "integration", producer: "test", payload: {},
      occurredAt: new Date(0).toISOString() };
    const job = { data } as Job<IntegrationEventJob>;
    await expect(process(job)).resolves.toEqual({ eventId: "event-1", duplicate: false });
    await expect(process(job)).resolves.toEqual({ eventId: "event-1", duplicate: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
