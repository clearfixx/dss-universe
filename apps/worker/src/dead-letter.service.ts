/**
 * DSS File Passport
 * File: apps/worker/src/dead-letter.service.ts
 * Purpose: Records terminal integration-event failures for operator recovery.
 */
import { randomUUID } from "node:crypto";
import type { Queue } from "bullmq";
import type { Pool } from "pg";
import { DSS_JOB_NAMES, type DeadLetterIntegrationEventJob } from "@dss/jobs";

export class DeadLetterService {
  constructor(
    private readonly pool: Pool,
    private readonly queue: Queue<DeadLetterIntegrationEventJob>,
    private readonly consumerName: string,
  ) {}
  async record(entry: DeadLetterIntegrationEventJob): Promise<void> {
    await this.pool.query(
      `INSERT INTO "dead_letter_events"
       ("id", "eventId", "sourceJobId", "eventName", "eventVersion", "consumerName", "reason", "payload", "attempts", "failedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)`,
      [
        randomUUID(),
        entry.event.eventId,
        entry.sourceJobId ?? null,
        entry.event.eventName,
        entry.event.eventVersion,
        this.consumerName,
        entry.reason,
        JSON.stringify(entry.event),
        entry.attempts,
        entry.failedAt,
      ],
    );
    await this.queue.add(DSS_JOB_NAMES.DEAD_LETTER_INTEGRATION_EVENT, entry, {
      jobId: `${entry.event.eventId}-${this.consumerName}`,
      removeOnComplete: false,
      removeOnFail: false,
    });
  }
}
