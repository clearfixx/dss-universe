/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/exceptions/media-access-forbidden.exception.ts
 *
 * 🎯 Purpose:
 * Rejects media access that is outside the caller's visibility scope.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export class MediaAccessForbiddenException extends Error {
  constructor() {
    super('You do not have access to this media.');
    this.name = MediaAccessForbiddenException.name;
  }
}
