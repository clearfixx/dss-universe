/**
 * DSS Universe — Integration Delivery Characterization
 * File: apps/worker/test/integration-delivery-boundary.characterization.spec.ts
 * Purpose: Pin current processor failure/replay boundaries before gamification design.
 * Ownership: Worker tests; the actual processor runs with controlled marker adapters.
 * Invariants: no runtime fixes, sleeps, real queue, database or exactly-once claim.
 */
import { describe, expect, it, vi } from "vitest";
import type { Job } from "bullmq";
import type { IntegrationEventJob, ProcessedEventStore } from "@dss/jobs";
import { createIntegrationEventProcessor } from "../src/integration-event.processor";

const job = {
  data: {
    eventId: "characterization-event",
    eventName: "comments.comment.created.v1",
    eventVersion: 1,
    category: "integration",
    producer: "synthetic",
    payload: { authorId: "synthetic-author" },
    occurredAt: new Date(0).toISOString(),
  },
} as Job<IntegrationEventJob>;

describe("current integration delivery boundary (not domain idempotency)", () => {
  it("does not mark a failed handler and invokes it on retry", async () => {
    const markers = new Set<string>();
    const mark = vi.fn(async (event: IntegrationEventJob, consumer: string) => {
      markers.add(`${consumer}:${event.eventId}`);
    });
    const store: ProcessedEventStore = {
      hasProcessed: async (id, consumer) => markers.has(`${consumer}:${id}`),
      markProcessed: mark,
    };
    const handler = vi
      .fn()
      .mockRejectedValueOnce(new Error("synthetic handler failure"))
      .mockResolvedValue(undefined);
    const process = createIntegrationEventProcessor(store, handler, "scope-a");
    await expect(process(job)).rejects.toThrow("synthetic handler failure");
    expect(mark).not.toHaveBeenCalled();
    await expect(process(job)).resolves.toEqual({
      eventId: job.data.eventId,
      duplicate: false,
    });
    expect(handler).toHaveBeenCalledTimes(2);
    expect(mark).toHaveBeenCalledTimes(1);
  });

  it("repeats a completed handler if marker persistence failed", async () => {
    let marked = false;
    const mark = vi
      .fn()
      .mockRejectedValueOnce(new Error("synthetic marker failure"))
      .mockImplementation(async () => {
        marked = true;
      });
    const handler = vi.fn(async () => undefined);
    const process = createIntegrationEventProcessor(
      { hasProcessed: async () => marked, markProcessed: mark },
      handler,
      "scope-a",
    );
    await expect(process(job)).rejects.toThrow("synthetic marker failure");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(marked).toBe(false);
    await expect(process(job)).resolves.toMatchObject({ duplicate: false });
    expect(handler).toHaveBeenCalledTimes(2);
    await expect(process(job)).resolves.toMatchObject({ duplicate: true });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("permits both concurrent attempts past a controlled absent-marker read", async () => {
    let reads = 0;
    let releaseReads!: () => void;
    let bothRead!: () => void;
    const released = new Promise<void>((resolve) => {
      releaseReads = resolve;
    });
    const arrived = new Promise<void>((resolve) => {
      bothRead = resolve;
    });
    const mark = vi.fn(async () => undefined);
    const store: ProcessedEventStore = {
      hasProcessed: async () => {
        reads += 1;
        if (reads === 2) bothRead();
        await released;
        return false;
      },
      markProcessed: mark,
    };
    const handler = vi.fn(async () => undefined);
    const process = createIntegrationEventProcessor(store, handler, "scope-a");
    const attempts = [process(job), process(job)];
    await arrived;
    expect(handler).not.toHaveBeenCalled();
    releaseReads();
    const results = await Promise.all(attempts);
    expect(results.map(({ duplicate }) => duplicate)).toEqual([false, false]);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(mark).toHaveBeenCalledTimes(2);
  });

  it("keeps markers scoped to consumer identity", async () => {
    const markers = new Set<string>();
    const store: ProcessedEventStore = {
      hasProcessed: async (id, consumer) => markers.has(`${consumer}:${id}`),
      markProcessed: async (event, consumer) => {
        markers.add(`${consumer}:${event.eventId}`);
      },
    };
    const first = vi.fn(async () => undefined);
    const second = vi.fn(async () => undefined);
    await createIntegrationEventProcessor(store, first, "scope-a")(job);
    await createIntegrationEventProcessor(store, second, "scope-b")(job);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(markers.size).toBe(2);
  });
});
