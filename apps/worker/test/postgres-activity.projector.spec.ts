/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity Worker Tests
 * 📄 File: apps/worker/test/postgres-activity.projector.spec.ts
 *
 * 🎯 Purpose:
 * Verifies Activity projection and retraction event handling.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import type { IntegrationEventJob } from "@dss/jobs";

import { PostgresActivityProjector } from "../src/postgres-activity.projector";

describe("PostgresActivityProjector", () => {
  const query = vi.fn(async () => ({ rowCount: 1 }));
  const projector = new PostgresActivityProjector({
    query,
  } as unknown as Pool);

  it("projects a profile-wall event without copying post content", async () => {
    const event: IntegrationEventJob = {
      eventId: "event-1",
      eventName: "users.profile-wall.post-created.v1",
      eventVersion: 1,
      category: "integration",
      producer: "dss.api.users",
      actorId: "author-1",
      aggregateType: "UserWallPost",
      aggregateId: "post-1",
      payload: {
        profileOwnerId: "owner-1",
        hasImage: true,
        body: "must not be projected",
      },
      occurredAt: "2026-07-27T00:00:00.000Z",
    };

    await projector.project(event);

    const values = query.mock.calls[0]?.[1] as unknown[];
    expect(values).toContain("PROFILE_WALL_POST_CREATED");
    expect(JSON.stringify(values)).not.toContain("must not be projected");
  });

  it("retracts projected activity for a tombstoned subject", async () => {
    await projector.project({
      eventId: "event-2",
      eventName: "users.profile-wall.post-retracted.v1",
      eventVersion: 1,
      category: "integration",
      producer: "dss.api.users",
      aggregateType: "UserWallPost",
      aggregateId: "post-1",
      payload: {},
      occurredAt: "2026-07-27T01:00:00.000Z",
    });

    expect(query.mock.calls.at(-1)?.[0]).toContain('SET "retractedAt"');
  });
});

/**
 * If a deleted post remains famous in the feed, the projector missed the memo.
 */
