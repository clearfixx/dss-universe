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

import { ForbiddenException } from '@nestjs/common';

export class MediaAccessForbiddenException extends ForbiddenException {
  constructor() {
    super('You do not have access to this media.');
  }
}
