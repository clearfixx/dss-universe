/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-cover.repository.ts
 *
 * 🎯 Purpose:
 * Reads cover candidates and delegates the cross-owner atomic write to its composition port.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';

import {
  PROFILE_ASSET_TRANSACTION,
  type ProfileAssetTransaction,
} from '../../contracts/profile-asset-transaction.port';
import { PrismaService } from '@api/core/database';

import { MediaKind } from '../../domain/enums/media-kind.enum';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import type {
  CoverAssignment,
  CoverRepository,
} from '../../domain/repositories/cover.repository.interface';
import type { CoverMediaCandidate } from '../../domain/types/cover-media-candidate.type';

@Injectable()
export class PrismaCoverRepository implements CoverRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROFILE_ASSET_TRANSACTION)
    private readonly transaction: ProfileAssetTransaction,
  ) {}

  async findCandidate(mediaId: string): Promise<CoverMediaCandidate | null> {
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      select: {
        id: true,
        ownerId: true,
        kind: true,
        status: true,
        visibility: true,
        variants: {
          select: { name: true, storageKey: true, mimeType: true },
        },
      },
    });

    return media
      ? {
          ...media,
          kind: media.kind as MediaKind,
          status: media.status as MediaStatus,
          visibility: media.visibility as MediaVisibility,
        }
      : null;
  }

  assign(input: CoverAssignment): Promise<void> {
    return this.transaction.assign({
      slot: 'COVER',
      subjectId: input.userId,
      actorId: input.actorId,
      mediaId: input.mediaId,
      url: input.coverUrl,
    });
  }
  remove(userId: string, actorId: string): Promise<void> {
    return this.transaction.remove('COVER', userId, actorId);
  }
}
