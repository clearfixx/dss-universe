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
import { MediaStatus } from '../enums/media-status.enum';
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';
import type { MediaMetadata } from './media-metadata.type';

export type CreateMediaInput = {
  id?: string;
  ownerId?: string | null;
  kind: MediaKind;
  status?: MediaStatus;
  visibility: MediaVisibility;
  storageProvider: MediaStorageProvider;
  bucket: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  size: number;
  checksum: string;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  altText?: string | null;
  caption?: string | null;
  metadata?: MediaMetadata | null;
};
