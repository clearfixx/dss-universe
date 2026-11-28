/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/contracts/referenced-files.contract.ts
 *
 * 🎯 Purpose:
 * Reads the bytes of a READY file that an owner record references.
 *
 * ⚠️ Important:
 * File visibility is NOT checked here. The caller must have decided that
 * this viewer may see this file of this record.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type MediaReferencedFileQuery = Readonly<{
  targetType: string;
  targetId: string;
  purpose: string;
  mediaId: string;
}>;

export type MediaReferencedFile = Readonly<{
  content: Buffer;
  mimeType: string;
  checksum: string;
  filename: string;
}>;

export interface MediaReferencedFiles {
  open(query: MediaReferencedFileQuery): Promise<MediaReferencedFile | null>;
}

export const MEDIA_REFERENCED_FILES = Symbol('MEDIA_REFERENCED_FILES');
