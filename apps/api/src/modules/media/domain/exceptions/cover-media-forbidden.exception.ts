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

import { ForbiddenException } from '@nestjs/common';

export class CoverMediaForbiddenException extends ForbiddenException {
  constructor() {
    super('You can only use your own media as a profile cover.');
  }
}
