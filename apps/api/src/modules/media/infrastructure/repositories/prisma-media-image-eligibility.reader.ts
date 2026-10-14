/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-media-image-eligibility.reader.ts
 *
 * 🎯 Purpose:
 * Checks owned image eligibility without exposing storage or binary metadata.
 *
 * 🧠 Responsibilities:
 * • checks ownership, image kind, readiness and absence of deletion;
 * • returns only the eligibility decision and propagates storage failures.
 *
 * 🏗️ Architecture:
 * Private Media read adapter; Users retains profile/block and posting policy.
 *
 * ⚠️ Important:
 * Visibility is not a condition here; this preserves the existing pre-write check.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { MediaImageEligibility } from '../../contracts/media-image-eligibility.contract';
@Injectable()
export class PrismaMediaImageEligibilityReader implements MediaImageEligibility {
  constructor(private readonly prisma: PrismaService) {}
  async isAttachableImage(mediaId: string, ownerId: string): Promise<boolean> {
    const count = await this.prisma.media.count({
      where: {
        id: mediaId,
        ownerId,
        kind: 'IMAGE',
        status: 'READY',
        deletedAt: null,
      },
    });
    return count === 1;
  }
}
