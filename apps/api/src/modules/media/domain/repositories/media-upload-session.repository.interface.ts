/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/repositories/media-upload-session.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence operations for Media v1 upload handshakes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { MediaUploadStatus } from '../enums/media-upload-status.enum';
import type { MediaMetadata } from '../types/media-metadata.type';
import type {
  CreateMediaUploadSessionInput,
  MediaUploadSession,
} from '../types/media-upload-session.type';

export const MEDIA_UPLOAD_SESSION_REPOSITORY = Symbol(
  'MEDIA_UPLOAD_SESSION_REPOSITORY',
);

export interface MediaUploadSessionRepository {
  create(input: CreateMediaUploadSessionInput): Promise<MediaUploadSession>;
  findById(id: string): Promise<MediaUploadSession | null>;
  /** Atomically enters UPLOADING from INITIATED; false leaves the row unchanged. */
  claimInitiated(id: string): Promise<boolean>;
  updateStatus(
    id: string,
    status: MediaUploadStatus,
    completedAt?: Date | null,
    metadata?: MediaMetadata | null,
  ): Promise<MediaUploadSession>;
}
