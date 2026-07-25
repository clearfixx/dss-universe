/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/media-delivery-candidate.type.ts
 *
 * 🎯 Purpose:
 * Defines the storage-neutral projection used for media access decisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { MediaStatus } from '../enums/media-status.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';

export type MediaDeliveryCandidate = {
  mediaId: string;
  ownerId: string | null;
  status: MediaStatus;
  visibility: MediaVisibility;
  variantName: string;
  storageKey: string;
  mimeType: string;
  checksum: string;
};
