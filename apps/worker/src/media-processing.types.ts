/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Worker
 * 📄 File: apps/worker/src/media-processing.types.ts
 *
 * 🎯 Purpose:
 * Defines semantic processing facts and persistence/file/scanner boundaries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { MediaProcessingJob } from "@dss/jobs";

export type ProcessedMediaFile = {
  name?: string;
  storageKey: string;
  mimeType: string;
  extension: string;
  size: number;
  checksum: string;
  checksumSha1: string;
  checksumMd5: string;
  width: number | null;
  height: number | null;
};

export type MediaProcessingResult = {
  original: ProcessedMediaFile;
  variants: ProcessedMediaFile[];
};

export type MediaMalwareScanResult =
  | { status: "CLEAN" }
  | { status: "INFECTED"; threatName: string };

export interface MediaProcessingStore {
  findStatus(mediaId: string): Promise<string | null>;
  claimFailedRetry(mediaId: string): Promise<boolean>;
  markProcessing(mediaId: string): Promise<void>;
  markQuarantined(mediaId: string, code: string, reason: string): Promise<void>;
  markReady(
    job: MediaProcessingJob,
    result: MediaProcessingResult,
  ): Promise<void>;
  markFailed(mediaId: string, code: string, reason: string): Promise<void>;
}

export interface MediaFileProcessor {
  transform(job: MediaProcessingJob): Promise<MediaProcessingResult>;
  cleanupSource(job: MediaProcessingJob): Promise<void>;
}

export interface MediaMalwareScanner {
  scan(job: MediaProcessingJob): Promise<MediaMalwareScanResult>;
}
