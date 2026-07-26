/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-user-social-graph.repository.ts
 *
 * 🎯 Purpose:
 * Persists reversible follow edges with transactional audit records.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';

import { AuditWriterService } from '@api/core/audit';
import { PrismaService } from '@api/core/database';

import type { UserSocialGraphRepository } from '../../domain/repositories/user-social-graph.repository.interface';
import type {
  UserFollowPage,
  UserSocialGraphSummary,
} from '../../domain/types/user-social-graph.type';

@Injectable()
export class PrismaUserSocialGraphRepository implements UserSocialGraphRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
  ) {}

  async follow(actorId: string, targetId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: actorId,
            followingId: targetId,
          },
        },
        select: { deletedAt: true },
      });
      if (existing?.deletedAt === null) {
        return;
      }
      await transaction.userFollow.upsert({
        where: {
          followerId_followingId: {
            followerId: actorId,
            followingId: targetId,
          },
        },
        create: { followerId: actorId, followingId: targetId },
        update: { deletedAt: null },
      });
      await this.audit.append(transaction, {
        action: 'user.follow.created',
        actorType: 'USER',
        actorId,
        targetType: 'User',
        targetId,
      });
    });
  }

  async unfollow(actorId: string, targetId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.userFollow.updateMany({
        where: {
          followerId: actorId,
          followingId: targetId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
      if (changed.count > 0) {
        await this.audit.append(transaction, {
          action: 'user.follow.removed',
          actorType: 'USER',
          actorId,
          targetType: 'User',
          targetId,
        });
      }
    });
  }

  async summaries(
    userIds: string[],
  ): Promise<Map<string, UserSocialGraphSummary>> {
    const uniqueIds = [...new Set(userIds)];
    const [followers, following] = await Promise.all([
      this.prisma.userFollow.groupBy({
        by: ['followingId'],
        where: { followingId: { in: uniqueIds }, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.userFollow.groupBy({
        by: ['followerId'],
        where: { followerId: { in: uniqueIds }, deletedAt: null },
        _count: { _all: true },
      }),
    ]);
    const result = new Map<string, UserSocialGraphSummary>(
      uniqueIds.map((userId) => [
        userId,
        { userId, followerCount: 0, followingCount: 0 },
      ]),
    );
    for (const row of followers) {
      const summary = result.get(row.followingId);
      if (summary) summary.followerCount = row._count._all;
    }
    for (const row of following) {
      const summary = result.get(row.followerId);
      if (summary) summary.followingCount = row._count._all;
    }
    return result;
  }

  followers(
    userId: string,
    page: number,
    limit: number,
  ): Promise<UserFollowPage> {
    return this.page('followingId', 'followerId', userId, page, limit);
  }

  following(
    userId: string,
    page: number,
    limit: number,
  ): Promise<UserFollowPage> {
    return this.page('followerId', 'followingId', userId, page, limit);
  }

  private async page(
    ownerField: 'followerId' | 'followingId',
    itemField: 'followerId' | 'followingId',
    userId: string,
    page: number,
    limit: number,
  ): Promise<UserFollowPage> {
    const where = { [ownerField]: userId, deletedAt: null };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.userFollow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { followerId: true, followingId: true },
      }),
      this.prisma.userFollow.count({ where }),
    ]);
    return {
      items: records.map((record) => record[itemField]),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
