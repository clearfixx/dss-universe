/**
 * DSS File Passport
 * File: apps/worker/src/media-processing.processor.ts
 * Purpose: Orchestrates idempotent Media transformation and persistence jobs.
 */

import type { Job } from "bullmq";
import type { MediaProcessingJob } from "@dss/jobs";
import type {
  MediaFileProcessor,
  MediaProcessingStore,
} from "./media-processing.types.js";

export function createMediaProcessingProcessor(
  store: MediaProcessingStore,
  files: MediaFileProcessor,
): (
  job: Job<MediaProcessingJob>,
) => Promise<{ mediaId: string; duplicate: boolean }> {
  return async (job) => {
    validateMediaProcessingJob(job.data);
    if ((await store.findStatus(job.data.mediaId)) === "READY") {
      return { mediaId: job.data.mediaId, duplicate: true };
    }

    try {
      const result = await files.transform(job.data);
      await store.markReady(job.data, result);
      await files.cleanupSource(job.data).catch(() => undefined);
      return { mediaId: job.data.mediaId, duplicate: false };
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      await store
        .markFailed(job.data.mediaId, "PROCESSING_FAILED", reason)
        .catch(() => undefined);
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
    !Number.isSafeInteger(data.size) ||
    data.size <= 0 ||
    !/^[a-f0-9]{64}$/.test(data.checksum)
  ) {
    throw new Error("Invalid media processing job.");
  }
}
