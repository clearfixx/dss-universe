/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/avatar-media-candidate.type.ts
 *
 * 🎯 Purpose:
 * Defines the storage-neutral media projection required by avatar rules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { MediaKind } from '../enums/media-kind.enum';
import { MediaStatus } from '../enums/media-status.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';

export type AvatarMediaVariant = {
  name: string;
  storageKey: string;
  mimeType: string;
};

export type AvatarMediaCandidate = {
  id: string;
  ownerId: string | null;
  kind: MediaKind;
  status: MediaStatus;
  visibility: MediaVisibility;
  variants: AvatarMediaVariant[];
};
