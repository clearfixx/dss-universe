/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/avatar.service.ts
 *
 * 🎯 Purpose:
 * Coordinates secure avatar assignment and removal.
 *
 * 🧠 Responsibilities:
 * • validates ownership and processed avatar variants;
 * • exposes stable public variant URLs;
 * • delegates atomic user, reference, and audit writes.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { MediaKind } from '../../domain/enums/media-kind.enum';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import { AvatarMediaForbiddenException } from '../../domain/exceptions/avatar-media-forbidden.exception';
import { InvalidAvatarMediaException } from '../../domain/exceptions/invalid-avatar-media.exception';
import {
  AVATAR_REPOSITORY,
  type AvatarRepository,
} from '../../domain/repositories/avatar.repository.interface';

const AVATAR_VARIANT = 'avatar-256';

@Injectable()
export class AvatarService {
  constructor(
    @Inject(AVATAR_REPOSITORY)
    private readonly avatars: AvatarRepository,
  ) {}

  async assign(userId: string, mediaId: string): Promise<void> {
    const media = await this.avatars.findCandidate(mediaId);
    if (!media) {
      throw new NotFoundException('Media not found.');
    }
    if (media.ownerId !== userId) {
      throw new AvatarMediaForbiddenException();
    }
    if (
      media.kind !== MediaKind.IMAGE ||
      media.status !== MediaStatus.READY ||
      media.visibility !== MediaVisibility.PUBLIC
    ) {
      throw new InvalidAvatarMediaException();
    }
    const variant = media.variants.find(({ name }) => name === AVATAR_VARIANT);
    if (!variant || variant.mimeType !== 'image/webp') {
      throw new InvalidAvatarMediaException(
        'The selected media is missing its processed avatar variant.',
      );
    }

    await this.avatars.assign({
      userId,
      actorId: userId,
      mediaId,
      avatarUrl: this.publicVariantUrl(mediaId, variant.name),
    });
  }

  remove(userId: string): Promise<void> {
    return this.avatars.remove(userId, userId);
  }

  publicVariantUrl(mediaId: string, variantName: string): string {
    return `/api/media/public/${mediaId}/${variantName}`;
  }
}
