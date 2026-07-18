/**
 * DSS File Passport
 * File: apps/worker/test/media-processing.processor.spec.ts
 * Purpose: Verifies validation at the Media processing worker boundary.
 */

import type { Job } from "bullmq";
import type { MediaProcessingJob } from "@dss/jobs";
import { describe, expect, it } from "vitest";
import { processMediaUpload } from "../src/media-processing.processor.js";

const data: MediaProcessingJob = {
  uploadSessionId: "session-1",
  ownerId: "owner-1",
  policyKey: "avatar",
  storageProvider: "LOCAL",
  bucket: "media",
  temporaryKey: "temporary/owner-1/upload-1",
  originalFilename: "avatar.png",
  mimeType: "image/png",
  size: 128,
  checksum: "a".repeat(64),
  queuedAt: "2026-07-18T12:00:00.000Z",
};

describe("processMediaUpload", () => {
  it("accepts a complete typed processing job", async () => {
    const job = { data } as Job<MediaProcessingJob>;

    await expect(processMediaUpload(job)).resolves.toEqual({
      uploadSessionId: data.uploadSessionId,
      accepted: true,
    });
  });

  it("rejects an invalid checksum boundary", async () => {
    const job = {
      data: { ...data, checksum: "invalid" },
    } as Job<MediaProcessingJob>;

    await expect(processMediaUpload(job)).rejects.toThrow(
      "Invalid media processing job.",
    );
  });
});
