/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/contracts/appeal-screenshots.contract.ts
 *
 * 🎯 Purpose:
 * Screenshot intake for a ban appeal and reviewer access to the result.
 *
 * ⚠️ Important:
 * The caller decides who may upload and who may review. Media enforces the
 * image-only policy, the malware scan and re-encoding.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type AppealScreenshotUpload = Readonly<{
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}>;

export type AppealScreenshot = Readonly<{
  mediaId: string;
  filename: string;
  size: number;
  /** CHECKING until the scan and re-encoding finish. */
  status: 'CHECKING' | 'READY' | 'REJECTED';
}>;

export interface MediaAppealScreenshots {
  intake(
    ownerId: string,
    file: AppealScreenshotUpload,
  ): Promise<AppealScreenshot>;
  describe(mediaIds: readonly string[]): Promise<AppealScreenshot[]>;
  /** A short-lived URL of the re-encoded image; null until it is clean. */
  reviewAccess(
    mediaId: string,
    reviewerId: string,
  ): Promise<{ url: string; expiresAt: Date } | null>;
}

export const MEDIA_APPEAL_SCREENSHOTS = Symbol('MEDIA_APPEAL_SCREENSHOTS');
