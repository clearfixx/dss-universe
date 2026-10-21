/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/contracts/public-attachment-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes existing public attachment metadata without storage coordinates or full Media rows.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const MEDIA_PUBLIC_ATTACHMENT_READER = Symbol(
  'MEDIA_PUBLIC_ATTACHMENT_READER',
);
export type MediaPublicAttachmentQuery = Readonly<{
  targetType: string;
  targetId: string;
  purpose: string;
  mediaIds: readonly string[];
}>;
export type MediaPublicAttachment = Readonly<{
  referenceId: string;
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
export interface MediaPublicAttachmentReader {
  read(
    query: MediaPublicAttachmentQuery,
  ): Promise<readonly MediaPublicAttachment[]>;
}
