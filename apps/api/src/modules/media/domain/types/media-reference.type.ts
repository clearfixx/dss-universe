/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/media-reference.type.ts
 *
 * 🎯 Purpose:
 * Defines a feature-owned reference that protects media from premature deletion.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type MediaReference = {
  id: string;
  mediaId: string;
  targetType: string;
  targetId: string;
  purpose: string;
  createdBy: string | null;
  createdAt: Date;
  removedAt: Date | null;
};
