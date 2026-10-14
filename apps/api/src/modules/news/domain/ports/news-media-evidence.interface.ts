/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/ports/news-media-evidence.interface.ts
 *
 * 🎯 Purpose:
 * Defines only attachment access/readiness facts needed by News policies.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type NewsMediaEvidence = Readonly<{
  ownerId: string | null;
  isPublic: boolean;
  isReady: boolean;
}>;
export interface NewsMediaEvidenceReader {
  findById(id: string): Promise<NewsMediaEvidence | null>;
}
export const NEWS_MEDIA_EVIDENCE = Symbol('NEWS_MEDIA_EVIDENCE');
