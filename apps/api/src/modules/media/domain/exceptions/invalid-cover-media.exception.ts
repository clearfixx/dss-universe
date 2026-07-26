/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/exceptions/invalid-cover-media.exception.ts
 *
 * 🎯 Purpose:
 * Rejects media that cannot safely become the current user's profile cover.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException } from '@nestjs/common';

export class InvalidCoverMediaException extends BadRequestException {
  constructor(
    message = 'The selected media cannot be used as a profile cover.',
  ) {
    super(message);
  }
}
