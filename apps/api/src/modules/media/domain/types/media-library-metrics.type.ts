/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/media-library-metrics.type.ts
 *
 * 🎯 Purpose:
 * Defines aggregate storage and lifecycle metrics for Mission Control.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type MediaLibraryMetrics = {
  totalMedia: number;
  originalBytes: number;
  variantBytes: number;
  totalBytes: number;
  orphanedMedia: number;
  failedMedia: number;
  quarantinedMedia: number;
};
