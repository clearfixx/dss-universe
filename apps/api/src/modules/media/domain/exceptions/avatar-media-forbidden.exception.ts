/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/exceptions/avatar-media-forbidden.exception.ts
 *
 * 🎯 Purpose:
 * Prevents a user from assigning media owned by another account.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export class AvatarMediaForbiddenException extends Error {
  constructor() {
    super('You can only use your own media as an avatar.');
    this.name = AvatarMediaForbiddenException.name;
  }
}
