/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/media-variant.type.ts
 *
 * 🎯 Purpose:
 * Defines a derived Media v1 asset without exposing a physical URL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';

export type MediaVariant = {
  id: string;
  mediaId: string;
  name: string;
  storageProvider: MediaStorageProvider;
  bucket: string;
  storageKey: string;
  mimeType: string;
  extension: string;
  size: number;
  checksum: string;
  width: number | null;
  height: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};
