/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-delivery.service.ts
 *
 * 🎯 Purpose:
 * Resolves public processed media variants without exposing storage internals.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { StorageService } from '@api/core/storage';

import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../domain/repositories/media.repository.interface';

export type DeliveredMedia = {
  content: Buffer;
  mimeType: string;
  checksum: string;
};

@Injectable()
export class MediaDeliveryService {
  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly media: MediaRepository,
    private readonly storage: StorageService,
  ) {}

  async publicVariant(
    mediaId: string,
    variantName: string,
  ): Promise<DeliveredMedia> {
    const variant = await this.media.findPublicVariant(mediaId, variantName);
    if (!variant) {
      throw new NotFoundException('Media variant not found.');
    }

    return {
      content: await this.storage.read(variant.storageKey),
      mimeType: variant.mimeType,
      checksum: variant.checksum,
    };
  }
}
