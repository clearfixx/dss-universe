/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/contracts/appeal-screenshots.port.ts
 *
 * 🎯 Purpose:
 * Consumer-owned port to the file owner for appeal screenshots.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ScreenshotUpload = Readonly<{
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}>;

export type ScreenshotFacts = Readonly<{
  mediaId: string;
  filename: string;
  size: number;
  status: 'CHECKING' | 'READY' | 'REJECTED';
}>;

export interface AppealScreenshotFiles {
  intake(ownerId: string, file: ScreenshotUpload): Promise<ScreenshotFacts>;
  describe(mediaIds: readonly string[]): Promise<ScreenshotFacts[]>;
  reviewAccess(
    mediaId: string,
    reviewerId: string,
  ): Promise<{ url: string; expiresAt: Date } | null>;
}

export const APPEAL_SCREENSHOT_FILES = Symbol('APPEAL_SCREENSHOT_FILES');
