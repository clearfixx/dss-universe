/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/exceptions/media-upload-policy.exception.ts
 *
 * 🎯 Purpose:
 * Reports a rejected Media v1 upload-policy declaration.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export class MediaUploadPolicyException extends Error {
  constructor(message: string) {
    super(message);
    this.name = MediaUploadPolicyException.name;
  }
}
