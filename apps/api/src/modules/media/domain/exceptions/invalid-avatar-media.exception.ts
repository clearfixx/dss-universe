/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/exceptions/invalid-avatar-media.exception.ts
 *
 * 🎯 Purpose:
 * Rejects media that cannot safely become the current user's avatar.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException } from '@nestjs/common';

export class InvalidAvatarMediaException extends BadRequestException {
  constructor(message = 'The selected media cannot be used as an avatar.') {
    super(message);
  }
}
