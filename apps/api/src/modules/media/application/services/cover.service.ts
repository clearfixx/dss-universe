/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/cover.service.ts
 *
 * 🎯 Purpose:
 * Coordinates secure profile cover assignment and removal.
 *
 * 🧠 Responsibilities:
 * • validates ownership and processed cover variants;
 * • exposes a stable public cover URL;
 * • delegates atomic user, reference, and audit writes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { MediaKind } from '../../domain/enums/media-kind.enum';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import { CoverMediaForbiddenException } from '../../domain/exceptions/cover-media-forbidden.exception';
import { InvalidCoverMediaException } from '../../domain/exceptions/invalid-cover-media.exception';
import {
  COVER_REPOSITORY,
  type CoverRepository,
} from '../../domain/repositories/cover.repository.interface';

const COVER_VARIANT = 'cover-1280';

@Injectable()
export class CoverService {
  constructor(
    @Inject(COVER_REPOSITORY)
    private readonly covers: CoverRepository,
  ) {}

  async assign(userId: string, mediaId: string): Promise<void> {
    const media = await this.covers.findCandidate(mediaId);
    if (!media) {
      throw new NotFoundException('Media not found.');
    }
    if (media.ownerId !== userId) {
      throw new CoverMediaForbiddenException();
    }
    if (
      media.kind !== MediaKind.IMAGE ||
      media.status !== MediaStatus.READY ||
      media.visibility !== MediaVisibility.PUBLIC
    ) {
      throw new InvalidCoverMediaException();
    }
    const variant = media.variants.find(({ name }) => name === COVER_VARIANT);
    if (!variant || variant.mimeType !== 'image/webp') {
      throw new InvalidCoverMediaException(
        'The selected media is missing its processed cover variant.',
      );
    }

    await this.covers.assign({
      userId,
      actorId: userId,
      mediaId,
      coverUrl: `/api/media/public/${mediaId}/${variant.name}`,
    });
  }

  remove(userId: string): Promise<void> {
    return this.covers.remove(userId, userId);
  }
}
