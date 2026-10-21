/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Worker
 * 📄 File: apps/worker/src/media-processing.processor.ts
 *
 * 🎯 Purpose:
 * Coordinates validated Media processing and safe automatic failed-state retry.
 *
 * 🧠 Responsibilities:
 * • claims FAILED before scan/transform and preserves terminal states;
 * • quarantines unsafe content and persists successful processing;
 * • propagates retryable failures without mutating another claim winner.
 *
 * 🏗️ Architecture:
 * Worker orchestration over semantic persistence/file/scanner contracts.
 *
 * ⚠️ Important:
 * A failed-state CAS is not an exclusive whole-attempt lease.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { Job } from "bullmq";
import { isMediaProcessingJob, type MediaProcessingJob } from "@dss/jobs";
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
    if (isTerminalStatus(status)) {
      return {
        mediaId: job.data.mediaId,
        duplicate: true,
        quarantined: false,
      };
    }

    if (
      status === "FAILED" &&
      !(await store.claimFailedRetry(job.data.mediaId))
    ) {
      const current = await store.findStatus(job.data.mediaId);
      if (isTerminalStatus(current)) {
        return {
          mediaId: job.data.mediaId,
          duplicate: true,
          quarantined: false,
        };
      }
      // Outside attempt catch: a claim loser must not fail the winner's row.
      throw new Error(`Media retry claim unavailable for ${job.data.mediaId}.`);
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
  if (!isMediaProcessingJob(data)) {
    throw new Error("Invalid media processing job.");
  }
}

function isTerminalStatus(status: string | null): boolean {
  return (
    status === "READY" ||
    status === "REJECTED" ||
    status === "DELETED" ||
    status === "DELETING"
  );
}
