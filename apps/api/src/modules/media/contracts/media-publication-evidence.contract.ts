/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/contracts/media-publication-evidence.contract.ts
 *
 * 🎯 Purpose:
 * Publishes only file ownership and public/readiness facts, never storage coordinates.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type MediaPublicationEvidence = Readonly<{
  ownerId: string | null;
  isPublic: boolean;
  isReady: boolean;
}>;
export interface MediaPublicationEvidenceReader {
  findById(id: string): Promise<MediaPublicationEvidence | null>;
}
export const MEDIA_PUBLICATION_EVIDENCE = Symbol('MEDIA_PUBLICATION_EVIDENCE');
