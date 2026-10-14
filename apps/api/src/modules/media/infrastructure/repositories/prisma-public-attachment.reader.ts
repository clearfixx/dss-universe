/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-public-attachment.reader.ts
 *
 * 🎯 Purpose:
 * Projects only public file metadata for active references owned by the requested coordinates.
 *
 * 🧠 Responsibilities:
 * • selects active references to READY/PUBLIC/non-deleted files;
 * • publishes only existing metadata and the owned public delivery URL.
 *
 * 🏗️ Architecture:
 * Private Media infrastructure projection; binary authorization stays in Media delivery.
 *
 * ⚠️ Important:
 * Never expose storage keys/buckets/scan metadata; missing matches are omitted, errors propagate.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  MediaPublicAttachmentReader,
  MediaPublicAttachmentQuery,
  MediaPublicAttachment,
} from '../../contracts/public-attachment-reader.contract';

@Injectable()
export class PrismaPublicAttachmentReader implements MediaPublicAttachmentReader {
  constructor(private readonly prisma: PrismaService) {}

  async read(
    query: MediaPublicAttachmentQuery,
  ): Promise<readonly MediaPublicAttachment[]> {
    if (query.mediaIds.length === 0) return [];
    const references = await this.prisma.mediaReference.findMany({
      where: {
        targetType: query.targetType,
        targetId: query.targetId,
        purpose: query.purpose,
        removedAt: null,
        mediaId: { in: [...query.mediaIds] },
        media: { status: 'READY', visibility: 'PUBLIC', deletedAt: null },
      },
      select: {
        id: true,
        mediaId: true,
        media: {
          select: {
            originalFilename: true,
            mimeType: true,
            extension: true,
            size: true,
            checksum: true,
            checksumSha1: true,
            checksumMd5: true,
          },
        },
      },
    });
    return references.map((reference) => ({
      referenceId: reference.id,
      mediaId: reference.mediaId,
      filename: reference.media.originalFilename,
      mimeType: reference.media.mimeType,
      extension: reference.media.extension,
      size: reference.media.size,
      checksumSha256: reference.media.checksum,
      checksumSha1: reference.media.checksumSha1,
      checksumMd5: reference.media.checksumMd5,
      downloadUrl: `/api/media/public/${reference.mediaId}/original`,
    }));
  }
}
