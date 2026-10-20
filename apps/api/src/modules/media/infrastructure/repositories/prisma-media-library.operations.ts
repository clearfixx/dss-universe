/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Persistence
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-media-library.operations.ts
 *
 * 🎯 Purpose:
 * Retains fixed Media library queries and cleanup claims for root composition.
 *
 * 🧠 Responsibilities:
 * • owns Media filters, pagination, metrics and domain mapping;
 * • rechecks references and external binding absence before claim;
 * • appends cleanup audit inside the supplied transaction.
 *
 * 🏗️ Architecture:
 * Guarded infrastructure adapter; root owns transaction lifetime.
 *
 * ⚠️ Important:
 * No arbitrary SQL, callbacks, nested transaction or profile lookup.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';
import type { PrismaService, TransactionClient } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import type { MediaLibraryQuery } from '../../domain/types/media-library-query.type';
import type { MediaCleanupCandidate } from '../../domain/types/media-cleanup-candidate.type';
import { PrismaMediaMapper } from '../mappers/prisma-media.mapper';
export class PrismaMediaLibraryOperations {
  constructor(private readonly audit: AuditWriterService) {}
  async browseLibrary(
    client: PrismaService,
    query: MediaLibraryQuery,
    externalAbsence: Prisma.MediaWhereInput,
  ) {
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
            ...externalAbsence,
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
    const records = await client.media.findMany({
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

  async getLibraryMetrics(
    client: PrismaService,
    externalAbsence: Prisma.MediaWhereInput,
  ) {
    const [media, variants, orphanedMedia, failedMedia, quarantinedMedia] =
      await Promise.all([
        client.media.aggregate({
          where: { status: { not: MediaStatus.DELETED } },
          _count: { _all: true },
          _sum: { size: true },
        }),
        client.mediaVariant.aggregate({
          where: { media: { status: { not: MediaStatus.DELETED } } },
          _sum: { size: true },
        }),
        client.media.count({
          where: {
            status: { not: MediaStatus.DELETED },
            references: { none: { removedAt: null } },
            ...externalAbsence,
          },
        }),
        client.media.count({ where: { status: MediaStatus.FAILED } }),
        client.media.count({ where: { status: MediaStatus.QUARANTINED } }),
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

  async claimCleanupCandidates(
    transaction: TransactionClient,
    olderThan: Date,
    limit: number,
    externalAbsence: Prisma.MediaWhereInput,
  ) {
    const candidates = await transaction.media.findMany({
      where: {
        OR: [
          {
            status: {
              in: [MediaStatus.READY, MediaStatus.FAILED, MediaStatus.REJECTED],
            },
            createdAt: { lt: olderThan },
          },
          { status: MediaStatus.DELETING },
        ],
        references: { none: { removedAt: null } },
        ...externalAbsence,
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
          ...externalAbsence,
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
