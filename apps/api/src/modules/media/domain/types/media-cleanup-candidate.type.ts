/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/media-cleanup-candidate.type.ts
 *
 * 🎯 Purpose:
 * Defines a claimed, unreferenced media resource ready for physical cleanup.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type MediaCleanupCandidate = {
  mediaId: string;
  storageKeys: string[];
};
