/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-avatar.repository.ts
 *
 * 🎯 Purpose:
 * Persists avatar changes, references, and immutable audit entries atomically.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ConflictException, Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';

import type {
  AvatarAssignment,
  AvatarRepository,
} from '../../domain/repositories/avatar.repository.interface';
import type { AvatarMediaCandidate } from '../../domain/types/avatar-media-candidate.type';
import { MediaKind } from '../../domain/enums/media-kind.enum';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';

const TARGET_TYPE = 'User';
const PURPOSE = 'avatar';

@Injectable()
export class PrismaAvatarRepository implements AvatarRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async findCandidate(mediaId: string): Promise<AvatarMediaCandidate | null> {
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

  async assign(input: AvatarAssignment): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const media = await transaction.media.findUnique({
        where: { id: input.mediaId },
        select: { ownerId: true, status: true, visibility: true },
      });
      if (
        !media ||
        media.ownerId !== input.userId ||
        media.status !== 'READY' ||
        media.visibility !== 'PUBLIC'
      ) {
        throw new ConflictException(
          'Avatar media changed before it could be assigned.',
        );
      }
      await transaction.mediaReference.updateMany({
        where: {
          targetType: TARGET_TYPE,
          targetId: input.userId,
          purpose: PURPOSE,
          removedAt: null,
        },
        data: { removedAt: new Date() },
      });
      await transaction.mediaReference.create({
        data: {
          mediaId: input.mediaId,
          targetType: TARGET_TYPE,
          targetId: input.userId,
          purpose: PURPOSE,
          createdBy: input.actorId,
        },
      });
      await transaction.user.update({
        where: { id: input.userId },
        data: {
          avatarMediaId: input.mediaId,
          avatarUrl: input.avatarUrl,
        },
      });
      await this.audit.append(transaction, {
        action: 'user.avatar.assigned',
        actorType: 'USER',
        actorId: input.actorId,
        targetType: TARGET_TYPE,
        targetId: input.userId,
        metadata: { mediaId: input.mediaId },
      });
    });
  }

  async remove(userId: string, actorId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.mediaReference.updateMany({
        where: {
          targetType: TARGET_TYPE,
          targetId: userId,
          purpose: PURPOSE,
          removedAt: null,
        },
        data: { removedAt: new Date() },
      });
      await transaction.user.update({
        where: { id: userId },
        data: { avatarMediaId: null, avatarUrl: null },
      });
      await this.audit.append(transaction, {
        action: 'user.avatar.removed',
        actorType: 'USER',
        actorId,
        targetType: TARGET_TYPE,
        targetId: userId,
      });
    });
  }
}
