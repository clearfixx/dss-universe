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
import type { MediaMetadata } from './media-metadata.type';
import type { MediaUploadPolicyKey } from './media-upload-policy.type';

export type MediaUploadSession = {
  id: string;
  ownerId: string | null;
  policyKey: MediaUploadPolicyKey;
  status: MediaUploadStatus;
  storageProvider: MediaStorageProvider;
  bucket: string;
  temporaryKey: string;
  originalFilename: string;
  declaredMimeType: string;
  declaredSize: number;
  checksum: string | null;
  metadata: MediaMetadata | null;
  expiresAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateMediaUploadSessionInput = {
  ownerId: string;
  policyKey: MediaUploadPolicyKey;
  storageProvider: MediaStorageProvider;
  bucket: string;
  temporaryKey: string;
  originalFilename: string;
  declaredMimeType: string;
  declaredSize: number;
  checksum?: string | null;
  metadata?: MediaMetadata | null;
  expiresAt: Date;
};
