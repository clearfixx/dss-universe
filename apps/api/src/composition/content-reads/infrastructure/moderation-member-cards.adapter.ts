/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/moderation-member-cards.adapter.ts
 *
 * 🎯 Purpose:
 * Binds Moderation's MODERATION_MEMBER_CARDS port to public profile
 * identity for the staff sanctions journal.
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
  ModerationMemberCard,
  ModerationMemberCardReader,
} from '@api/modules/moderation';

@Injectable()
export class ModerationMemberCardsAdapter implements ModerationMemberCardReader {
  constructor(private readonly prisma: PrismaService) {}

  async cards(
    ids: readonly string[],
  ): Promise<readonly ModerationMemberCard[]> {
    if (ids.length === 0) return [];
    return this.prisma.user.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
  }
}
