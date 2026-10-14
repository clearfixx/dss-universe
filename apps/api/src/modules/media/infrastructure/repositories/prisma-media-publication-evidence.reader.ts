/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-media-publication-evidence.reader.ts
 *
 * 🎯 Purpose:
 * Selects the exact three facts required for content publication evidence.
 *
 * 🧠 Responsibilities:
 * • selects owner, visibility and status without binary/storage metadata;
 * • preserves missing results and propagates database failures.
 *
 * 🏗️ Architecture:
 * Owned Media infrastructure reader; consumers receive only semantic facts.
 *
 * ⚠️ Important:
 * System media ownership is nullable; this reader must not invent a new access policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  MediaPublicationEvidenceReader,
  MediaPublicationEvidence,
} from '../../contracts/media-publication-evidence.contract';

@Injectable()
export class PrismaMediaPublicationEvidenceReader implements MediaPublicationEvidenceReader {
  constructor(private readonly prisma: PrismaService) {}
  async findById(id: string): Promise<MediaPublicationEvidence | null> {
    const record = await this.prisma.media.findUnique({
      where: { id },
      select: { ownerId: true, visibility: true, status: true },
    });
    return record
      ? {
          ownerId: record.ownerId,
          isPublic: record.visibility === 'PUBLIC',
          isReady: record.status === 'READY',
        }
      : null;
  }
}
