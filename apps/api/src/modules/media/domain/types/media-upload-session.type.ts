/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/media-upload-session.type.ts
 *
 * 🎯 Purpose:
 * Defines the storage-agnostic Media v1 upload handshake.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import { MediaUploadStatus } from '../enums/media-upload-status.enum';

export type MediaUploadSession = {
  id: string;
  ownerId: string | null;
  policyKey: string;
  status: MediaUploadStatus;
  storageProvider: MediaStorageProvider;
  bucket: string;
  temporaryKey: string;
  originalFilename: string;
  declaredMimeType: string;
  declaredSize: number;
  checksum: string | null;
  metadata: Record<string, unknown> | null;
  expiresAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
