/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-media.repository.ts
 *
 * 🎯 Purpose:
 * Implements Media persistence through Prisma.
 *
 * 🧠 Responsibilities:
 * • persists and loads Media domain records;
 * • scopes owner listings away from deleted records;
 * • exposes active-reference counts for safe deletion workflows.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';

import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaStorageProvider } from '../../domain/enums/media-storage-provider.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import type { MediaCleanupCandidate } from '../../domain/types/media-cleanup-candidate.type';
import type { MediaRepository } from '../../domain/repositories/media.repository.interface';
import type { CreateMediaInput } from '../../domain/types/create-media.input';
import type { UpdateMediaInput } from '../../domain/types/update-media.input';
import type { MediaLibraryQuery } from '../../domain/types/media-library-query.type';
import { PrismaMediaMapper } from '../mappers/prisma-media.mapper';

@Injectable()
export class PrismaMediaRepository implements MediaRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async create(input: CreateMediaInput) {
    const data: Prisma.MediaUncheckedCreateInput = {
      ...input,
      metadata: input.metadata ?? undefined,
    };
    const record = await this.prisma.media.create({ data });
    return PrismaMediaMapper.toDomain(record);
  }

  async findById(id: string) {
    const record = await this.prisma.media.findUnique({ where: { id } });
    return record ? PrismaMediaMapper.toDomain(record) : null;
  }

  async findByOwnerId(ownerId: string) {
    const records = await this.prisma.media.findMany({
      where: { ownerId, status: { not: MediaStatus.DELETED } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => PrismaMediaMapper.toDomain(record));
  }

  async findQuarantined(limit: number) {
    const records = await this.prisma.media.findMany({
      where: { status: MediaStatus.QUARANTINED, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return records.map((record) => PrismaMediaMapper.toDomain(record));
  }

  async browseLibrary(query: MediaLibraryQuery) {
    const where: Prisma.MediaWhereInput = {
      ...(query.search
        ? {
            OR: [
              {
                originalFilename: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              { mimeType: { contains: query.search, mode: 'insensitive' } },
              { checksum: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.visibility ? { visibility: query.visibility } : {}),
      ...(query.orphaned
        ? {
            references: { none: { removedAt: null } },
            avatarFor: null,
          }
        : {}),
      ...(query.cursor
        ? {
            AND: [
              {
                OR: [
                  { createdAt: { lt: query.cursor.createdAt } },
                  {
                    createdAt: query.cursor.createdAt,
                    id: { lt: query.cursor.id },
                  },
                ],
              },
            ],
          }
        : {}),
    };
    const records = await this.prisma.media.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.first + 1,
    });
    const hasNextPage = records.length > query.first;
    return {
      items: records
        .slice(0, query.first)
        .map((record) => PrismaMediaMapper.toDomain(record)),
      hasNextPage,
    };
  }

  async getLibraryMetrics() {
    const [media, variants, orphanedMedia, failedMedia, quarantinedMedia] =
      await Promise.all([
        this.prisma.media.aggregate({
          where: { status: { not: MediaStatus.DELETED } },
          _count: { _all: true },
          _sum: { size: true },
        }),
        this.prisma.mediaVariant.aggregate({
          where: { media: { status: { not: MediaStatus.DELETED } } },
          _sum: { size: true },
        }),
        this.prisma.media.count({
          where: {
            status: { not: MediaStatus.DELETED },
            references: { none: { removedAt: null } },
            avatarFor: null,
          },
        }),
        this.prisma.media.count({ where: { status: MediaStatus.FAILED } }),
        this.prisma.media.count({ where: { status: MediaStatus.QUARANTINED } }),
      ]);
    const originalBytes = media._sum.size ?? 0;
    const variantBytes = variants._sum.size ?? 0;
    return {
      totalMedia: media._count._all,
      originalBytes,
      variantBytes,
      totalBytes: originalBytes + variantBytes,
      orphanedMedia,
      failedMedia,
      quarantinedMedia,
    };
  }

  async update(id: string, input: UpdateMediaInput) {
    const record = await this.prisma.media.update({
      where: { id },
      data: input,
    });
    return PrismaMediaMapper.toDomain(record);
  }

  async softDelete(id: string) {
    const deletedAt = new Date();
    const record = await this.prisma.media.update({
      where: { id },
      data: { status: MediaStatus.DELETED, deletedAt },
    });
    return PrismaMediaMapper.toDomain(record);
  }

  countActiveReferences(id: string): Promise<number> {
    return this.prisma.mediaReference.count({
      where: { mediaId: id, removedAt: null },
    });
  }

  async findPublicVariant(mediaId: string, variantName: string) {
    const variant = await this.prisma.mediaVariant.findFirst({
      where: {
        mediaId,
        name: variantName,
        media: {
          status: MediaStatus.READY,
          visibility: 'PUBLIC',
          deletedAt: null,
        },
      },
    });

    return variant
      ? {
          ...variant,
          storageProvider:
            variant.storageProvider as unknown as MediaStorageProvider,
          metadata: PrismaMediaMapper.toMetadata(variant.metadata),
        }
      : null;
  }

  async findDeliveryCandidate(mediaId: string, variantName: string) {
    const variant = await this.prisma.mediaVariant.findFirst({
      where: {
        mediaId,
        name: variantName,
        media: { deletedAt: null },
      },
      include: {
        media: {
          select: {
            ownerId: true,
            status: true,
            visibility: true,
          },
        },
      },
    });

    return variant
      ? {
          mediaId: variant.mediaId,
          ownerId: variant.media.ownerId,
          status: variant.media.status as MediaStatus,
          visibility: variant.media.visibility as MediaVisibility,
          variantName: variant.name,
          storageKey: variant.storageKey,
          mimeType: variant.mimeType,
          checksum: variant.checksum,
        }
      : null;
  }

  claimCleanupCandidates(olderThan: Date, limit: number) {
    return this.prisma.$transaction(
      async (transaction) => {
        const candidates = await transaction.media.findMany({
          where: {
            OR: [
              {
                status: {
                  in: [
                    MediaStatus.READY,
                    MediaStatus.FAILED,
                    MediaStatus.REJECTED,
                  ],
                },
                createdAt: { lt: olderThan },
              },
              { status: MediaStatus.DELETING },
            ],
            references: { none: { removedAt: null } },
            avatarFor: null,
          },
          include: {
            variants: { select: { storageKey: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: limit,
        });

        const claimed: MediaCleanupCandidate[] = [];
        for (const candidate of candidates) {
          const result = await transaction.media.updateMany({
            where: {
              id: candidate.id,
              status: {
                in: [
                  MediaStatus.READY,
                  MediaStatus.FAILED,
                  MediaStatus.REJECTED,
                  MediaStatus.DELETING,
                ],
              },
              references: { none: { removedAt: null } },
              avatarFor: null,
            },
            data: { status: MediaStatus.DELETING },
          });
          if (result.count !== 1) {
            continue;
          }
          await this.audit.append(transaction, {
            action: 'media.cleanup.claimed',
            actorType: 'SYSTEM',
            targetType: 'Media',
            targetId: candidate.id,
          });
          claimed.push({
            mediaId: candidate.id,
            storageKeys: [
              candidate.storageKey,
              ...this.temporaryStorageKeys(candidate.metadata),
              ...candidate.variants.map(({ storageKey }) => storageKey),
            ],
          });
        }
        return claimed;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async completeCleanup(mediaId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.media.updateMany({
        where: { id: mediaId, status: MediaStatus.DELETING },
        data: {
          status: MediaStatus.DELETED,
          deletedAt: new Date(),
        },
      });
      if (result.count !== 1) {
        return;
      }
      await this.audit.append(transaction, {
        action: 'media.cleanup.completed',
        actorType: 'SYSTEM',
        targetType: 'Media',
        targetId: mediaId,
      });
    });
  }

  async recordCleanupFailure(mediaId: string, reason: string): Promise<void> {
    await this.prisma.$transaction((transaction) =>
      this.audit.append(transaction, {
        action: 'media.cleanup.failed',
        actorType: 'SYSTEM',
        targetType: 'Media',
        targetId: mediaId,
        result: 'FAILURE',
        reason,
      }),
    );
  }

  async recordQuarantineRescan(
    mediaId: string,
    actorId: string,
  ): Promise<void> {
    await this.prisma.$transaction((transaction) =>
      this.audit.append(transaction, {
        action: 'media.quarantine.rescan_requested',
        actorType: 'USER',
        actorId,
        targetType: 'Media',
        targetId: mediaId,
      }),
    );
  }

  async claimFailedRetry(
    mediaId: string,
    actorId: string,
  ): Promise<ReturnType<typeof PrismaMediaMapper.toDomain> | null> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.media.updateMany({
        where: { id: mediaId, status: MediaStatus.FAILED },
        data: {
          status: MediaStatus.PROCESSING,
          failureCode: null,
          failureReason: null,
        },
      });
      if (result.count !== 1) return null;
      const record = await transaction.media.findUniqueOrThrow({
        where: { id: mediaId },
      });
      await this.audit.append(transaction, {
        action: 'media.processing.retry_requested',
        actorType: 'USER',
        actorId,
        targetType: 'Media',
        targetId: mediaId,
      });
      return PrismaMediaMapper.toDomain(record);
    });
  }

  async recordFailedRetryQueueFailure(
    mediaId: string,
    actorId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.media.updateMany({
        where: { id: mediaId, status: MediaStatus.PROCESSING },
        data: {
          status: MediaStatus.FAILED,
          failureCode: 'RETRY_QUEUE_FAILED',
          failureReason: reason.slice(0, 2_000),
        },
      });
      await this.audit.append(transaction, {
        action: 'media.processing.retry_queue_failed',
        actorType: 'USER',
        actorId,
        targetType: 'Media',
        targetId: mediaId,
        result: 'FAILURE',
        reason,
      });
    });
  }

  async rejectQuarantined(
    mediaId: string,
    actorId: string,
  ): Promise<ReturnType<typeof PrismaMediaMapper.toDomain> | null> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.media.updateMany({
        where: { id: mediaId, status: MediaStatus.QUARANTINED },
        data: { status: MediaStatus.REJECTED },
      });
      if (result.count !== 1) return null;
      const record = await transaction.media.findUniqueOrThrow({
        where: { id: mediaId },
      });
      await this.audit.append(transaction, {
        action: 'media.quarantine.rejected',
        actorType: 'USER',
        actorId,
        targetType: 'Media',
        targetId: mediaId,
        reason: record.failureReason ?? undefined,
      });
      return PrismaMediaMapper.toDomain(record);
    });
  }

  private temporaryStorageKeys(metadata: Prisma.JsonValue): string[] {
    if (
      metadata === null ||
      Array.isArray(metadata) ||
      typeof metadata !== 'object'
    ) {
      return [];
    }
    const temporaryKey = metadata.temporaryKey;
    return typeof temporaryKey === 'string' && temporaryKey.length > 0
      ? [temporaryKey]
      : [];
  }
}
