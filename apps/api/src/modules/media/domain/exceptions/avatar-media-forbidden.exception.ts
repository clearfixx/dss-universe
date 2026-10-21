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

import { ForbiddenException } from '@nestjs/common';

export class AvatarMediaForbiddenException extends ForbiddenException {
  constructor() {
    super('You can only use your own media as an avatar.');
  }
}
