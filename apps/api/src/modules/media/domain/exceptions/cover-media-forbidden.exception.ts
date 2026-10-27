/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/exceptions/cover-media-forbidden.exception.ts
 *
 * 🎯 Purpose:
 * Rejects attempts to use another user's media as a profile cover.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export class CoverMediaForbiddenException extends Error {
  constructor() {
    super('You can only use your own media as a profile cover.');
    this.name = CoverMediaForbiddenException.name;
  }
}
