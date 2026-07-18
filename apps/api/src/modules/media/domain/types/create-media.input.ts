/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/create-media.input.ts
 *
 * 🎯 Purpose:
 * Defines input required to create a media domain record.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { MediaKind } from '../enums/media-kind.enum';
import { MediaStorage } from '../enums/media-storage.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';

export type CreateMediaInput = {
  ownerId?: string | null;
  kind: MediaKind;
  visibility: MediaVisibility;
  storage: MediaStorage;
  path: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  size: number;
  checksum: string;
  width?: number | null;
  height?: number | null;
};
