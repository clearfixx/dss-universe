/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/ports/news-attachment-reader.interface.ts
 *
 * 🎯 Purpose:
 * Defines only the attachment metadata needed to compose the existing full News response.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const NEWS_ATTACHMENT_READER = Symbol('NEWS_ATTACHMENT_READER');
export type NewsAttachmentFile = Readonly<{
  id: string;
  mediaId: string;
  filename: string;
  mimeType: string;
  extension: string;
  size: number;
  checksumSha256: string;
  checksumSha1: string | null;
  checksumMd5: string | null;
  downloadUrl: string;
}>;
export interface NewsAttachmentReader {
  read(
    articleId: string,
    mediaIds: readonly string[],
  ): Promise<readonly NewsAttachmentFile[]>;
}
