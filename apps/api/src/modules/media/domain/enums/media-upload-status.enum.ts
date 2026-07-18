/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/enums/media-upload-status.enum.ts
 *
 * 🎯 Purpose:
 * Defines the lifecycle of a Media v1 upload session.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export enum MediaUploadStatus {
  INITIATED = 'INITIATED',
  UPLOADING = 'UPLOADING',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}
