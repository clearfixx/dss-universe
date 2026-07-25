/**
 * DSS File Passport
 * File: apps/worker/src/local-media-file.processor.ts
 * Purpose: Transforms local Media binaries into permanent originals and variants.
 */

import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, rm, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import type { MediaProcessingJob, MediaProcessingVariantSpec } from "@dss/jobs";
import sharp, { type Sharp } from "sharp";
import type {
  MediaFileProcessor,
  MediaProcessingResult,
  ProcessedMediaFile,
} from "./media-processing.types.js";

const MAX_INPUT_PIXELS = 40_000_000;

export class LocalMediaFileProcessor implements MediaFileProcessor {
  private readonly uploadsRoot: string;

  constructor(uploadsRoot = process.env.DSS_UPLOADS_DIR) {
    this.uploadsRoot = resolve(
      uploadsRoot ?? resolve(process.cwd(), "uploads"),
    );
  }

  async transform(job: MediaProcessingJob): Promise<MediaProcessingResult> {
    if (job.storageProvider !== "LOCAL") {
      throw new Error(
        `Unsupported Media storage provider: ${job.storageProvider}.`,
      );
    }

    const sourcePath = this.resolveKey(job.temporaryKey);
    const destinationPath = this.resolveKey(job.destinationKey);
    await access(sourcePath);
    await mkdir(dirname(destinationPath), { recursive: true });

    if (job.processingKind === "PASSTHROUGH") {
      await copyFile(sourcePath, destinationPath);
      return {
        original: await this.describeFile(
          destinationPath,
          job.destinationKey,
          job.mimeType,
        ),
        variants: [],
      };
    }

    const original = await this.writeImage(
      sourcePath,
      destinationPath,
      job.destinationKey,
    );
    const variants = await Promise.all(
      job.variants.map((variant) => this.writeVariant(sourcePath, variant)),
    );
    return { original, variants };
  }

  async cleanupSource(job: MediaProcessingJob): Promise<void> {
    await rm(this.resolveKey(job.temporaryKey), { force: true });
  }

  private async writeImage(
    sourcePath: string,
    destinationPath: string,
    storageKey: string,
  ): Promise<ProcessedMediaFile> {
    const info = await this.openImage(sourcePath)
      .rotate()
      .webp({ quality: 90 })
      .toFile(destinationPath);
    return this.describeImage(
      destinationPath,
      storageKey,
      info.width,
      info.height,
    );
  }

  private async writeVariant(
    sourcePath: string,
    variant: MediaProcessingVariantSpec,
  ): Promise<ProcessedMediaFile> {
    const destinationPath = this.resolveKey(variant.storageKey);
    await mkdir(dirname(destinationPath), { recursive: true });
    const info = await this.openImage(sourcePath)
      .rotate()
      .resize({
        width: variant.width,
        ...(variant.height ? { height: variant.height } : {}),
        fit: variant.fit,
        withoutEnlargement: variant.fit === "inside",
      })
      .webp({ quality: 85 })
      .toFile(destinationPath);
    return {
      ...(await this.describeImage(
        destinationPath,
        variant.storageKey,
        info.width,
        info.height,
      )),
      name: variant.name,
    };
  }

  private async describeImage(
    path: string,
    storageKey: string,
    width: number,
    height: number,
  ): Promise<ProcessedMediaFile> {
    return {
      ...(await this.describeFile(path, storageKey, "image/webp")),
      width,
      height,
    };
  }

  private async describeFile(
    path: string,
    storageKey: string,
    mimeType: string,
  ): Promise<ProcessedMediaFile> {
    const [contents, details] = await Promise.all([readFile(path), stat(path)]);
    return {
      storageKey,
      mimeType,
      extension: extname(storageKey).slice(1).toLowerCase(),
      size: details.size,
      checksum: createHash("sha256").update(contents).digest("hex"),
      width: null,
      height: null,
    };
  }

  private resolveKey(key: string): string {
    const path = resolve(this.uploadsRoot, key.replaceAll("\\", "/"));
    const relativePath = relative(this.uploadsRoot, path);
    if (
      isAbsolute(relativePath) ||
      relativePath === ".." ||
      relativePath.startsWith("../")
    ) {
      throw new Error("Media storage key escapes the configured uploads root.");
    }
    return path;
  }

  private openImage(path: string): Sharp {
    return sharp(path, {
      failOn: "warning",
      limitInputPixels: MAX_INPUT_PIXELS,
      sequentialRead: true,
    });
  }
}
