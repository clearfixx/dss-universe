/**
 * DSS File Passport
 * File: apps/worker/test/media-processing.processor.spec.ts
 * Purpose: Verifies idempotent Media worker orchestration and failure persistence.
 */

import type { Job } from "bullmq";
import type { MediaProcessingJob } from "@dss/jobs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMediaProcessingProcessor } from "../src/media-processing.processor.js";
import type {
  MediaFileProcessor,
  MediaMalwareScanner,
  MediaProcessingResult,
  MediaProcessingStore,
} from "../src/media-processing.types.js";

const data: MediaProcessingJob = {
  mediaId: "media-1",
  uploadSessionId: "session-1",
  ownerId: "owner-1",
  policyKey: "avatar",
  storageProvider: "LOCAL",
  bucket: "media",
  temporaryKey: "temporary/owner-1/upload-1",
  destinationKey: "media/owner-1/media-1/original.webp",
  originalFilename: "avatar.png",
  mimeType: "image/png",
  size: 128,
  checksum: "a".repeat(64),
  scanRequired: false,
  processingKind: "IMAGE",
  variants: [
    {
      name: "avatar-64",
      storageKey: "media/owner-1/media-1/variants/avatar-64.webp",
      width: 64,
      height: 64,
      fit: "cover",
    },
  ],
  queuedAt: "2026-07-18T12:00:00.000Z",
};
const result: MediaProcessingResult = {
  original: {
    storageKey: data.destinationKey,
    mimeType: "image/webp",
    extension: "webp",
    size: 100,
    checksum: "b".repeat(64),
    width: 256,
    height: 256,
  },
  variants: [],
};

describe("createMediaProcessingProcessor", () => {
  const store = {
    findStatus: vi.fn(),
    markProcessing: vi.fn(),
    markQuarantined: vi.fn(),
    markReady: vi.fn(),
    markFailed: vi.fn(),
  };
  const files = {
    transform: vi.fn(),
    cleanupSource: vi.fn(),
  };
  const scanner = {
    scan: vi.fn(),
  };
  const processor = createMediaProcessingProcessor(
    store as MediaProcessingStore,
    files as MediaFileProcessor,
    scanner as MediaMalwareScanner,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    store.findStatus.mockResolvedValue("PROCESSING");
    store.markReady.mockResolvedValue(undefined);
    store.markProcessing.mockResolvedValue(undefined);
    store.markQuarantined.mockResolvedValue(undefined);
    store.markFailed.mockResolvedValue(undefined);
    scanner.scan.mockResolvedValue({ status: "CLEAN" });
    files.transform.mockResolvedValue(result);
    files.cleanupSource.mockResolvedValue(undefined);
  });

  it("transforms and persists a valid processing job", async () => {
    await expect(
      processor({ data } as Job<MediaProcessingJob>),
    ).resolves.toEqual({
      mediaId: data.mediaId,
      duplicate: false,
      quarantined: false,
    });
    expect(store.markReady).toHaveBeenCalledWith(data, result);
    expect(files.cleanupSource).toHaveBeenCalledWith(data);
  });

  it("does not transform an already-ready media record", async () => {
    store.findStatus.mockResolvedValue("READY");
    await expect(
      processor({ data } as Job<MediaProcessingJob>),
    ).resolves.toEqual({
      mediaId: data.mediaId,
      duplicate: true,
      quarantined: false,
    });
    expect(files.transform).not.toHaveBeenCalled();
  });

  it("persists processing failures before retrying", async () => {
    files.transform.mockRejectedValue(new Error("Invalid image"));
    await expect(
      processor({ data } as Job<MediaProcessingJob>),
    ).rejects.toThrow("Invalid image");
    expect(store.markFailed).toHaveBeenCalledWith(
      data.mediaId,
      "PROCESSING_FAILED",
      "Invalid image",
    );
  });

  it("quarantines infected media without transforming it", async () => {
    scanner.scan.mockResolvedValue({
      status: "INFECTED",
      threatName: "Eicar-Signature",
    });
    const scanJob = { ...data, scanRequired: true };
    await expect(
      processor({ data: scanJob } as Job<MediaProcessingJob>),
    ).resolves.toEqual({
      mediaId: data.mediaId,
      duplicate: false,
      quarantined: true,
    });
    expect(store.markQuarantined).toHaveBeenCalledWith(
      data.mediaId,
      "MALWARE_DETECTED",
      "Eicar-Signature",
    );
    expect(files.transform).not.toHaveBeenCalled();
  });

  it("fails closed when the malware scanner is unavailable", async () => {
    scanner.scan.mockRejectedValue(new Error("ClamAV unavailable"));
    const scanJob = { ...data, scanRequired: true };
    await expect(
      processor({ data: scanJob } as Job<MediaProcessingJob>),
    ).rejects.toThrow("ClamAV unavailable");
    expect(store.markQuarantined).toHaveBeenCalledWith(
      data.mediaId,
      "SCAN_UNAVAILABLE",
      "ClamAV unavailable",
    );
    expect(store.markFailed).not.toHaveBeenCalled();
  });

  it("returns clean quarantined media to processing during a rescan", async () => {
    store.findStatus.mockResolvedValue("QUARANTINED");
    const scanJob = { ...data, scanRequired: true };
    await processor({ data: scanJob } as Job<MediaProcessingJob>);
    expect(store.markProcessing).toHaveBeenCalledWith(data.mediaId);
    expect(files.transform).toHaveBeenCalledWith(scanJob);
  });
});
