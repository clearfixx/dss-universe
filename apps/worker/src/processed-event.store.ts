/**
 * DSS File Passport
 * File: apps/worker/src/processed-event.store.ts
 * Purpose: Persists consumer idempotency markers in PostgreSQL.
 */
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { IntegrationEventJob, ProcessedEventStore } from "@dss/jobs";

export class PostgresProcessedEventStore implements ProcessedEventStore {
  constructor(private readonly pool: Pool) {}
  async hasProcessed(eventId: string, consumerName: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM "processed_events" WHERE "eventId" = $1 AND "consumerName" = $2 LIMIT 1',
      [eventId, consumerName],
    );
    return (result.rowCount ?? 0) > 0;
  }
  async markProcessed(event: IntegrationEventJob, consumerName: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO "processed_events"
       ("id", "eventId", "consumerName", "eventName", "eventVersion")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("eventId", "consumerName") DO NOTHING`,
      [randomUUID(), event.eventId, consumerName, event.eventName, event.eventVersion],
    );
  }
}
