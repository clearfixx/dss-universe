/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Integration Worker Tests
 * 📄 File: apps/worker/test/integration-event-consumer.spec.ts
 *
 * 🎯 Purpose:
 * Guards historical deduplication and shared main/processor/DLQ identity wiring.
 *
 * 🏗️ Architecture:
 * In-memory behavior and source AST checks; main is not loaded or started.
 *
 * ⚠️ Important:
 * These tests do not prove PostgreSQL or live queue retry behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import type { Job, Queue } from "bullmq";
import type { Pool } from "pg";
import type { IntegrationEventJob, ProcessedEventStore } from "@dss/jobs";
import { INTEGRATION_EVENT_CONSUMER_NAME } from "../src/integration-event-consumer.js";
import { createIntegrationEventProcessor } from "../src/integration-event.processor.js";
import { DeadLetterService } from "../src/dead-letter.service.js";

const event: IntegrationEventJob = {
  eventId: "historical-identity-control",
  eventName: "test.identity.v1",
  eventVersion: 1,
  category: "integration",
  producer: "test",
  payload: {},
  occurredAt: "2026-10-22T00:00:00.000Z",
};

describe("durable integration consumer identity", () => {
  it("retains historical v1 markers without invoking the handler", async () => {
    const handler = vi.fn(async () => undefined);
    const markProcessed = vi.fn(async () => undefined);
    const store: ProcessedEventStore = {
      hasProcessed: async (id, consumer) =>
        id === event.eventId && consumer === "dss.worker.integration-events.v1",
      markProcessed,
    };
    const consume = createIntegrationEventProcessor(store, handler);
    await expect(
      consume({ data: event } as Job<IntegrationEventJob>),
    ).resolves.toEqual({
      eventId: event.eventId,
      duplicate: true,
    });
    expect(handler).not.toHaveBeenCalled();
    expect(markProcessed).not.toHaveBeenCalled();
  });

  it("writes new markers under the canonical unchanged identity", async () => {
    const markProcessed = vi.fn(async () => undefined);
    const consume = createIntegrationEventProcessor({
      hasProcessed: async () => false,
      markProcessed,
    });
    await consume({ data: event } as Job<IntegrationEventJob>);
    expect(markProcessed).toHaveBeenCalledWith(
      event,
      INTEGRATION_EVENT_CONSUMER_NAME,
    );
    expect(INTEGRATION_EVENT_CONSUMER_NAME).toBe(
      "dss.worker.integration-events.v1",
    );
  });

  it("uses that same identity for new DLQ records and job suffixes", async () => {
    const query = vi
      .fn<(sql: string, values: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ rows: [] });
    const add = vi.fn(async () => undefined);
    await new DeadLetterService(
      { query } as unknown as Pool,
      { add } as unknown as Queue,
      INTEGRATION_EVENT_CONSUMER_NAME,
    ).record({
      event,
      reason: "synthetic",
      attempts: 1,
      failedAt: event.occurredAt,
    });
    expect(query.mock.calls[0][1][5]).toBe(INTEGRATION_EVENT_CONSUMER_NAME);
    expect(add).toHaveBeenCalledWith(expect.any(String), expect.any(Object), {
      jobId: `${event.eventId}-${INTEGRATION_EVENT_CONSUMER_NAME}`,
      removeOnComplete: false,
      removeOnFail: false,
    });
  });

  it("main explicitly supplies the same named constant to processor and DLQ", () => {
    const source = ts.createSourceFile(
      "main.ts",
      readFileSync(new URL("../src/main.ts", import.meta.url), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const identities: string[] = [];
    function visit(node: ts.Node) {
      if (
        (ts.isNewExpression(node) || ts.isCallExpression(node)) &&
        ts.isIdentifier(node.expression) &&
        ["DeadLetterService", "createIntegrationEventProcessor"].includes(
          node.expression.text,
        )
      )
        identities.push(node.arguments?.[2]?.getText(source) ?? "missing");
      ts.forEachChild(node, visit);
    }
    visit(source);
    expect(identities).toEqual([
      "INTEGRATION_EVENT_CONSUMER_NAME",
      "INTEGRATION_EVENT_CONSUMER_NAME",
    ]);
  });
});
