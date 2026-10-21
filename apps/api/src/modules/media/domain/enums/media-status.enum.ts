/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/enums/media-status.enum.ts
 *
 * 🎯 Purpose:
 * Defines the immutable Media v1 processing lifecycle states.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export enum MediaStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
  QUARANTINED = 'QUARANTINED',
  DELETING = 'DELETING',
  DELETED = 'DELETED',
}
