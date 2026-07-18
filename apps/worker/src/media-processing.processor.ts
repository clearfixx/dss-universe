/**
 * DSS File Passport
 * File: apps/worker/src/media-processing.processor.ts
 * Purpose: Validates the stable Media processing job boundary before processing.
 */

import type { Job } from "bullmq";
import type { MediaProcessingJob } from "@dss/jobs";

export async function processMediaUpload(
  job: Job<MediaProcessingJob>,
): Promise<{ uploadSessionId: string; accepted: true }> {
  const data = job.data;
  if (
    !data.uploadSessionId ||
    !data.ownerId ||
    !data.temporaryKey ||
    !data.mimeType ||
    !Number.isSafeInteger(data.size) ||
    data.size <= 0 ||
    !/^[a-f0-9]{64}$/.test(data.checksum)
  ) {
    throw new Error("Invalid media processing job.");
  }

  return {
    uploadSessionId: data.uploadSessionId,
    accepted: true,
  };
}
