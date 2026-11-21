/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/forum-member-cards.adapter.ts
 *
 * 🎯 Purpose:
 * Binds Forum's FORUM_MEMBER_CARDS port to public profile identity, the same
 * fields News delivery shows for authors and voters.
 *
 * ⚠️ Important:
 * Selects only id, username, displayName and avatarUrl; one query per batch.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  ForumMemberCard,
  ForumMemberCardReader,
} from '@api/modules/forum';

@Injectable()
export class ForumMemberCardsAdapter implements ForumMemberCardReader {
  constructor(private readonly prisma: PrismaService) {}

  async cards(ids: readonly string[]): Promise<readonly ForumMemberCard[]> {
    if (ids.length === 0) return [];
    return this.prisma.user.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
  }
}
