import { describe, expect, it } from "vitest";
import type { Job } from "bullmq";
import { processIntegrationEvent } from "../src/integration-event.processor";

describe("processIntegrationEvent", () => {
  it("acknowledges a valid versioned job", async () => {
    const job = {
      data: { eventId: "event-1", eventName: "test.created", eventVersion: 1 },
    } as Job;
    await expect(processIntegrationEvent(job)).resolves.toEqual({
      eventId: "event-1",
    });
  });
});
