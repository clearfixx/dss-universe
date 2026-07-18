/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/update-media.input.ts
 *
 * 🎯 Purpose:
 * Defines allowed mutable fields for media records.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { MediaVisibility } from '../enums/media-visibility.enum';

export type UpdateMediaInput = {
  visibility?: MediaVisibility;
  deletedAt?: Date | null;
};
