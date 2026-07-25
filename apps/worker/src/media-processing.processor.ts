/**
 * DSS File Passport
 * File: apps/worker/src/media-processing.processor.ts
 * Purpose: Orchestrates idempotent Media transformation and persistence jobs.
 */

import type { Job } from "bullmq";
import type { MediaProcessingJob } from "@dss/jobs";
import type {
  MediaFileProcessor,
  MediaMalwareScanner,
  MediaProcessingStore,
} from "./media-processing.types.js";

export function createMediaProcessingProcessor(
  store: MediaProcessingStore,
  files: MediaFileProcessor,
  scanner: MediaMalwareScanner,
): (
  job: Job<MediaProcessingJob>,
) => Promise<{ mediaId: string; duplicate: boolean; quarantined: boolean }> {
  return async (job) => {
    validateMediaProcessingJob(job.data);
    const status = await store.findStatus(job.data.mediaId);
    if (status === "READY" || status === "REJECTED" || status === "DELETED") {
      return {
        mediaId: job.data.mediaId,
        duplicate: true,
        quarantined: false,
      };
    }

    let quarantinedDuringAttempt = false;
    try {
      if (job.data.scanRequired) {
        let scan;
        try {
          scan = await scanner.scan(job.data);
        } catch (error: unknown) {
          const reason =
            error instanceof Error ? error.message : "Malware scan failed.";
          await store.markQuarantined(
            job.data.mediaId,
            "SCAN_UNAVAILABLE",
            reason,
          );
          quarantinedDuringAttempt = true;
          throw error;
        }
        if (scan.status === "INFECTED") {
          await store.markQuarantined(
            job.data.mediaId,
            "MALWARE_DETECTED",
            scan.threatName,
          );
          return {
            mediaId: job.data.mediaId,
            duplicate: false,
            quarantined: true,
          };
        }
      }
      if (status === "QUARANTINED") {
        await store.markProcessing(job.data.mediaId);
      }
      const result = await files.transform(job.data);
      await store.markReady(job.data, result);
      await files.cleanupSource(job.data).catch(() => undefined);
      return {
        mediaId: job.data.mediaId,
        duplicate: false,
        quarantined: false,
      };
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      if (
        !quarantinedDuringAttempt &&
        (await store.findStatus(job.data.mediaId)) !== "QUARANTINED"
      ) {
        await store
          .markFailed(job.data.mediaId, "PROCESSING_FAILED", reason)
          .catch(() => undefined);
      }
      throw error;
    }
  };
}

export function validateMediaProcessingJob(data: MediaProcessingJob): void {
  if (
    !data.mediaId ||
    !data.uploadSessionId ||
    !data.ownerId ||
    !data.temporaryKey ||
    !data.destinationKey ||
    !data.mimeType ||
    typeof data.scanRequired !== "boolean" ||
    !Number.isSafeInteger(data.size) ||
    data.size <= 0 ||
    !/^[a-f0-9]{64}$/.test(data.checksum)
  ) {
    throw new Error("Invalid media processing job.");
  }
}
