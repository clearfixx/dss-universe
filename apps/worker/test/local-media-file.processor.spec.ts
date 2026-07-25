/**
 * DSS File Passport
 * File: apps/worker/test/local-media-file.processor.spec.ts
 * Purpose: Verifies real Sharp image conversion and Media variant generation.
 */

import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import type { MediaProcessingJob } from "@dss/jobs";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { LocalMediaFileProcessor } from "../src/local-media-file.processor.js";

describe("LocalMediaFileProcessor", () => {
  let root: string | null = null;

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
    root = null;
  });

  it("converts an image to WEBP and produces the requested variant", async () => {
    root = await mkdtemp(join(tmpdir(), "dss-media-worker-"));
    const sourceKey = "temporary/owner/upload.png";
    const sourcePath = join(root, sourceKey);
    await mkdir(dirname(sourcePath), { recursive: true });
    await sharp({
      create: {
        width: 320,
        height: 200,
        channels: 4,
        background: { r: 67, g: 42, b: 180, alpha: 1 },
      },
    })
      .png()
      .toFile(sourcePath);

    const job: MediaProcessingJob = {
      mediaId: "media-1",
      uploadSessionId: "session-1",
      ownerId: "owner",
      policyKey: "avatar",
      storageProvider: "LOCAL",
      bucket: "media",
      temporaryKey: sourceKey,
      destinationKey: "media/owner/media-1/original.webp",
      originalFilename: "avatar.png",
      mimeType: "image/png",
      size: (await readFile(sourcePath)).length,
      checksum: "a".repeat(64),
      scanRequired: false,
      processingKind: "IMAGE",
      variants: [
        {
          name: "avatar-64",
          storageKey: "media/owner/media-1/variants/avatar-64.webp",
          width: 64,
          height: 64,
          fit: "cover",
        },
      ],
      queuedAt: new Date().toISOString(),
    };

    const result = await new LocalMediaFileProcessor(root).transform(job);
    expect(result.original).toMatchObject({
      mimeType: "image/webp",
      width: 320,
      height: 200,
    });
    expect(result.variants[0]).toMatchObject({
      name: "avatar-64",
      width: 64,
      height: 64,
    });
    expect(
      await sharp(join(root, job.destinationKey)).metadata(),
    ).toMatchObject({
      format: "webp",
    });
  });

  it("rejects a storage key that escapes the uploads root", async () => {
    root = await mkdtemp(join(tmpdir(), "dss-media-worker-"));
    const processor = new LocalMediaFileProcessor(root);
    const invalidJob = {
      temporaryKey: "../escape.png",
      storageProvider: "LOCAL",
    } as MediaProcessingJob;
    await expect(processor.transform(invalidJob)).rejects.toThrow(
      "escapes the configured uploads root",
    );
  });
});
