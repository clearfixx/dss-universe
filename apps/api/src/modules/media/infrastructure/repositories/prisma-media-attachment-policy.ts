/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-media-attachment-policy.ts
 *
 * 🎯 Purpose:
 * Batch attach-permission decision for the acting user.
 *
 * ⚠️ Important:
 * System files (no owner) are attachable only when public.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  MediaAttachmentDecision,
  MediaAttachmentPolicy,
  MediaAttachmentRejection,
} from '../../contracts/media-attachment-policy.contract';

@Injectable()
export class PrismaMediaAttachmentPolicy implements MediaAttachmentPolicy {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
    actorId: string,
    mediaIds: readonly string[],
  ): Promise<MediaAttachmentDecision> {
    const unique = [...new Set(mediaIds)];
    if (unique.length === 0) return { attachable: [], rejected: [] };
    const rows = await this.prisma.media.findMany({
      where: { id: { in: unique } },
      select: { id: true, ownerId: true, visibility: true, status: true },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const attachable: string[] = [];
    const rejected: MediaAttachmentRejection[] = [];
    for (const mediaId of unique) {
      const row = byId.get(mediaId);
      if (!row) rejected.push({ mediaId, reason: 'NOT_FOUND' });
      else if (row.status !== 'READY')
        rejected.push({ mediaId, reason: 'NOT_READY' });
      else if (row.ownerId !== actorId && row.visibility !== 'PUBLIC')
        rejected.push({ mediaId, reason: 'NOT_PERMITTED' });
      else attachable.push(mediaId);
    }
    return { attachable, rejected };
  }
}
