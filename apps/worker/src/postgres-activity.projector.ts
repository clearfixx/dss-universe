/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity Worker
 * 📄 File: apps/worker/src/postgres-activity.projector.ts
 *
 * 🎯 Purpose:
 * Builds the privacy-safe Activity read model from integration events.
 *
 * 🧠 Responsibilities:
 * • projects supported versioned events idempotently;
 * • retracts feed entries when their source content is tombstoned;
 * • ignores unrelated events without coupling their producers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { IntegrationEventJob } from "@dss/jobs";

const WALL_POST_CREATED_EVENT = "users.profile-wall.post-created.v1";
const WALL_POST_RETRACTED_EVENT = "users.profile-wall.post-retracted.v1";

export class PostgresActivityProjector {
  constructor(private readonly pool: Pool) {}

  async project(event: IntegrationEventJob): Promise<void> {
    if (event.eventName === WALL_POST_CREATED_EVENT) {
      await this.projectWallPost(event);
      return;
    }
    if (event.eventName === WALL_POST_RETRACTED_EVENT) {
      await this.retractWallPost(event);
    }
  }

  private async projectWallPost(event: IntegrationEventJob): Promise<void> {
    if (
      !event.actorId ||
      event.aggregateType !== "UserWallPost" ||
      !event.aggregateId
    ) {
      throw new Error("Invalid profile-wall activity event.");
    }
    const payload = this.payload(event.payload);
    await this.pool.query(
      `INSERT INTO "activity_entries"
       ("id", "sourceEventId", "actorId", "module", "action",
        "subjectType", "subjectId", "visibility", "metadata",
        "occurredAt", "createdAt", "updatedAt")
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, 'MEMBERS', $8::jsonb,
         $9::timestamptz AT TIME ZONE 'UTC', NOW(), NOW()
       )
       ON CONFLICT ("sourceEventId") DO NOTHING`,
      [
        randomUUID(),
        event.eventId,
        event.actorId,
        "PROFILE",
        "PROFILE_WALL_POST_CREATED",
        event.aggregateType,
        event.aggregateId,
        JSON.stringify({
          profileOwnerId: this.optionalString(payload.profileOwnerId),
          hasImage: payload.hasImage === true,
        }),
        event.occurredAt,
      ],
    );
  }

  private async retractWallPost(event: IntegrationEventJob): Promise<void> {
    if (event.aggregateType !== "UserWallPost" || !event.aggregateId) {
      throw new Error("Invalid profile-wall retraction event.");
    }
    await this.pool.query(
      `UPDATE "activity_entries"
       SET "retractedAt" = COALESCE(
         "retractedAt", $1::timestamptz AT TIME ZONE 'UTC'
       ), "updatedAt" = NOW()
       WHERE "subjectType" = $2 AND "subjectId" = $3`,
      [event.occurredAt, event.aggregateType, event.aggregateId],
    );
  }

  private payload(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private optionalString(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
  }
}

/**
 * 🔭 The projector watches events, not domain tables. No telescope through
 * module walls, please.
 */
