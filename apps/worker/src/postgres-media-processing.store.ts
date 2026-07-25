/**
 * DSS File Passport
 * File: apps/worker/src/postgres-media-processing.store.ts
 * Purpose: Atomically persists processed Media originals, variants, and status.
 */

import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { MediaProcessingJob } from "@dss/jobs";
import type {
  MediaProcessingResult,
  MediaProcessingStore,
} from "./media-processing.types.js";

export class PostgresMediaProcessingStore implements MediaProcessingStore {
  constructor(private readonly pool: Pool) {}

  async findStatus(mediaId: string): Promise<string | null> {
    const result = await this.pool.query<{ status: string }>(
      'SELECT "status"::text AS "status" FROM "media" WHERE "id" = $1',
      [mediaId],
    );
    return result.rows[0]?.status ?? null;
  }

  async markProcessing(mediaId: string): Promise<void> {
    await this.pool.query(
      `UPDATE "media" SET "status" = 'PROCESSING'::"MediaStatus",
        "failureCode" = NULL, "failureReason" = NULL, "updatedAt" = NOW()
       WHERE "id" = $1 AND "status" = 'QUARANTINED'::"MediaStatus"`,
      [mediaId],
    );
  }

  async markQuarantined(
    mediaId: string,
    code: string,
    reason: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE "media" SET "status" = 'QUARANTINED'::"MediaStatus",
        "failureCode" = $2, "failureReason" = $3, "updatedAt" = NOW()
       WHERE "id" = $1 AND "status" IN (
         'PROCESSING'::"MediaStatus", 'QUARANTINED'::"MediaStatus"
       )`,
      [mediaId, code, reason.slice(0, 2_000)],
    );
  }

  async markReady(
    job: MediaProcessingJob,
    result: MediaProcessingResult,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const variant of result.variants) {
        await client.query(
          `INSERT INTO "media_variants"
            ("id", "mediaId", "name", "storageProvider", "bucket", "storageKey",
             "mimeType", "extension", "size", "checksum", "width", "height")
           VALUES ($1, $2, $3, $4::"MediaStorageProvider", $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT ("mediaId", "name") DO UPDATE SET
             "storageKey" = EXCLUDED."storageKey", "mimeType" = EXCLUDED."mimeType",
             "extension" = EXCLUDED."extension", "size" = EXCLUDED."size",
             "checksum" = EXCLUDED."checksum", "width" = EXCLUDED."width",
             "height" = EXCLUDED."height"`,
          [
            randomUUID(),
            job.mediaId,
            variant.name,
            job.storageProvider,
            job.bucket,
            variant.storageKey,
            variant.mimeType,
            variant.extension,
            variant.size,
            variant.checksum,
            variant.width,
            variant.height,
          ],
        );
      }
      const updated = await client.query(
        `UPDATE "media" SET
          "status" = 'READY'::"MediaStatus", "storageKey" = $2,
          "mimeType" = $3, "extension" = $4, "size" = $5, "checksum" = $6,
          "width" = $7, "height" = $8, "readyAt" = NOW(), "updatedAt" = NOW(),
          "failureCode" = NULL, "failureReason" = NULL
         WHERE "id" = $1 AND "status" = 'PROCESSING'::"MediaStatus"`,
        [
          job.mediaId,
          result.original.storageKey,
          result.original.mimeType,
          result.original.extension,
          result.original.size,
          result.original.checksum,
          result.original.width,
          result.original.height,
        ],
      );
      if (updated.rowCount !== 1) {
        throw new Error(`Media record ${job.mediaId} was not found.`);
      }
      await client.query("COMMIT");
    } catch (error: unknown) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async markFailed(
    mediaId: string,
    code: string,
    reason: string,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE "media" SET "status" = 'FAILED'::"MediaStatus",
        "failureCode" = $2, "failureReason" = $3, "updatedAt" = NOW()
       WHERE "id" = $1 AND "status" = 'PROCESSING'::"MediaStatus"`,
      [mediaId, code, reason.slice(0, 2_000)],
    );
  }
}
