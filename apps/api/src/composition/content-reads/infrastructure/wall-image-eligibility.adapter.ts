/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/wall-image-eligibility.adapter.ts
 *
 * 🎯 Purpose:
 * Binds the Media image decision to the Users-owned Wall eligibility port.
 *
 * 🧠 Responsibilities:
 * • forwards only media and author coordinates;
 * • preserves eligibility and owner failures without a default allow.
 *
 * 🏗️ Architecture:
 * Root adapter; Media owns the file decision, Users owns posting authorization.
 *
 * ⚠️ Important:
 * This does not add a new transactional recheck or visibility rule.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  MEDIA_IMAGE_ELIGIBILITY,
  type MediaImageEligibility,
} from '@api/modules/media';
import type { WallImageEligibility } from '@api/modules/users';
@Injectable()
export class WallImageEligibilityAdapter implements WallImageEligibility {
  constructor(
    @Inject(MEDIA_IMAGE_ELIGIBILITY)
    private readonly media: MediaImageEligibility,
  ) {}
  isAttachableImage(mediaId: string, ownerId: string): Promise<boolean> {
    return this.media.isAttachableImage(mediaId, ownerId);
  }
}
