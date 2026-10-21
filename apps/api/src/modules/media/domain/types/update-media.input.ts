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
import { MediaStatus } from '../enums/media-status.enum';

export type UpdateMediaInput = {
  visibility?: MediaVisibility;
  status?: MediaStatus;
  altText?: string | null;
  caption?: string | null;
  failureCode?: string | null;
  failureReason?: string | null;
  readyAt?: Date | null;
  deletedAt?: Date | null;
};
