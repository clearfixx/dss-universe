/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-user-activity-context.reader.ts
 *
 * 🎯 Purpose:
 * Reads minimal Users-owned personalization facts without exposing profile or relationship records.
 *
 * 🧠 Responsibilities:
 * • selects interests, followed IDs and active bidirectional blocked IDs;
 * • preserves missing-profile and sequential/parallel read semantics.
 *
 * 🏗️ Architecture:
 * Private Users infrastructure reader; ranking and candidate filtering remain Activity-owned.
 *
 * ⚠️ Important:
 * No ACTIVE/privacy filter is invented; failures must not become empty-success context.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  UserActivityContextReader,
  UserActivityContext,
} from '../../contracts/activity-context-reader.contract';

@Injectable()
export class PrismaUserActivityContextReader implements UserActivityContextReader {
  constructor(private readonly prisma: PrismaService) {}

  async readForViewer(viewerId: string): Promise<UserActivityContext> {
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { interests: true },
    });
    const [following, blocks] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followerId: viewerId, deletedAt: null },
        select: { followingId: true },
      }),
      this.prisma.userBlock.findMany({
        where: {
          deletedAt: null,
          OR: [{ blockerId: viewerId }, { blockedId: viewerId }],
        },
        select: { blockerId: true, blockedId: true },
      }),
    ]);
    return {
      interests: [...(viewer?.interests ?? [])],
      followingIds: following.map((edge) => edge.followingId),
      blockedIds: blocks.map((block) =>
        block.blockerId === viewerId ? block.blockedId : block.blockerId,
      ),
    };
  }
}
