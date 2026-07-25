/**
 * DSS File Passport
 * File: apps/worker/src/media-processing.types.ts
 * Purpose: Defines typed results and persistence boundaries for Media processing.
 */

import type { MediaProcessingJob } from "@dss/jobs";

export type ProcessedMediaFile = {
  name?: string;
  storageKey: string;
  mimeType: string;
  extension: string;
  size: number;
  checksum: string;
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
