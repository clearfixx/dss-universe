/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-user-block.repository.ts
 *
 * 🎯 Purpose:
 * Persists blocks and atomically removes incompatible follow edges.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';

import type { UserBlockRepository } from '../../domain/repositories/user-block.repository.interface';
import type { UserFollowPage } from '../../domain/types/user-social-graph.type';

@Injectable()
export class PrismaUserBlockRepository implements UserBlockRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async block(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.userBlock.findUnique({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        select: { deletedAt: true },
      });
      if (existing?.deletedAt === null) return;
      await transaction.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: { deletedAt: null },
      });
      await transaction.userFollow.updateMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      await this.audit.append(transaction, {
        action: 'user.block.created',
        actorType: 'USER',
        actorId: blockerId,
        targetType: 'User',
        targetId: blockedId,
      });
    });
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.userBlock.updateMany({
        where: { blockerId, blockedId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (changed.count === 0) return;
      await this.audit.append(transaction, {
        action: 'user.block.removed',
        actorType: 'USER',
        actorId: blockerId,
        targetType: 'User',
        targetId: blockedId,
      });
    });
  }

  async existsEitherDirection(
    userId: string,
    otherUserId: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.userBlock.count({
        where: {
          OR: [
            { blockerId: userId, blockedId: otherUserId },
            { blockerId: otherUserId, blockedId: userId },
          ],
          deletedAt: null,
        },
      })) > 0
    );
  }

  async blockedUsers(
    userId: string,
    page: number,
    limit: number,
  ): Promise<UserFollowPage> {
    const where = { blockerId: userId, deletedAt: null };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.userBlock.findMany({
        where,
        select: { blockedId: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.userBlock.count({ where }),
    ]);
    return {
      items: records.map(({ blockedId }) => blockedId),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
