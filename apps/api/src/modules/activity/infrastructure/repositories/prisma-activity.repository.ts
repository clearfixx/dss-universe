/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/infrastructure/repositories/prisma-activity.repository.ts
 *
 * 🎯 Purpose:
 * Reads active activity projections from PostgreSQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { ActivityVisibility, type Prisma } from '@prisma/client';

import { PrismaService } from '@api/core/database';
import type { PaginatedResult } from '@api/shared';

import type { ActivityRepository } from '../../domain/repositories/activity.repository.interface';
import type {
  ActivityEntry,
  ActivityFeedItem,
  ActivityFeedPage,
  ActivityFeedQuery,
  ActivityFeedReason,
} from '../../domain/types/activity-entry.type';

@Injectable()
export class PrismaActivityRepository implements ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByActor(
    actorId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ActivityEntry>> {
    const where: Prisma.ActivityEntryWhereInput = {
      actorId,
      retractedAt: null,
      visibility: {
        in: [ActivityVisibility.PUBLIC, ActivityVisibility.MEMBERS],
      },
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.activityEntry.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activityEntry.count({ where }),
    ]);

    return {
      items: records.map((record) => ({
        id: record.id,
        actorId: record.actorId,
        module: record.module,
        action: record.action,
        subjectType: record.subjectType,
        subjectId: record.subjectId,
        visibility: record.visibility,
        metadata: this.metadata(record.metadata),
        occurredAt: record.occurredAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findFeed(query: ActivityFeedQuery): Promise<ActivityFeedPage> {
    const generatedAt = new Date();
    const state = query.viewerId
      ? await this.prisma.activityFeedState.findUnique({
          where: { userId: query.viewerId },
          select: { lastVisitedAt: true },
        })
      : null;
    const viewer = query.viewerId
      ? await this.prisma.user.findUnique({
          where: { id: query.viewerId },
          select: { interests: true },
        })
      : null;
    const [following, blocks] = query.viewerId
      ? await Promise.all([
          this.prisma.userFollow.findMany({
            where: { followerId: query.viewerId, deletedAt: null },
            select: { followingId: true },
          }),
          this.prisma.userBlock.findMany({
            where: {
              deletedAt: null,
              OR: [
                { blockerId: query.viewerId },
                { blockedId: query.viewerId },
              ],
            },
            select: { blockerId: true, blockedId: true },
          }),
        ])
      : [[], []];
    const blockedIds = new Set(
      blocks.map((block) =>
        block.blockerId === query.viewerId ? block.blockedId : block.blockerId,
      ),
    );
    const where: Prisma.ActivityEntryWhereInput = {
      retractedAt: null,
      visibility: query.viewerId
        ? { in: [ActivityVisibility.PUBLIC, ActivityVisibility.MEMBERS] }
        : ActivityVisibility.PUBLIC,
      ...(query.modules?.length ? { module: { in: query.modules } } : {}),
      ...(blockedIds.size ? { actorId: { notIn: [...blockedIds] } } : {}),
    };
    const records = await this.prisma.activityEntry.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: 500,
    });
    const followingIds = new Set(following.map((edge) => edge.followingId));
    const interests = new Set(
      (viewer?.interests ?? []).map((interest) => interest.toLowerCase()),
    );
    const ranked = records
      .map((record) => {
        const metadata = this.metadata(record.metadata);
        const reason = this.reason(
          record.actorId,
          metadata,
          query.viewerId,
          followingIds,
          interests,
        );
        return {
          id: record.id,
          actorId: record.actorId,
          module: record.module,
          action: record.action,
          subjectType: record.subjectType,
          subjectId: record.subjectId,
          visibility: record.visibility,
          metadata,
          occurredAt: record.occurredAt,
          isUnread: Boolean(
            query.viewerId &&
            (!state || record.occurredAt > state.lastVisitedAt),
          ),
          reason,
          score: this.score(reason, record.occurredAt, generatedAt),
        } satisfies ActivityFeedItem;
      })
      .sort((left, right) =>
        right.score !== left.score
          ? right.score - left.score
          : right.occurredAt.getTime() - left.occurredAt.getTime() ||
            right.id.localeCompare(left.id),
      );
    const start = (query.page - 1) * query.limit;
    return {
      items: ranked.slice(start, start + query.limit),
      total: ranked.length,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(ranked.length / query.limit),
      unreadCount: ranked.filter((item) => item.isUnread).length,
      lastVisitedAt: state?.lastVisitedAt ?? null,
      generatedAt,
      recommendationMode: 'DETERMINISTIC',
    };
  }

  async markVisited(viewerId: string, visitedAt: Date): Promise<Date> {
    const state = await this.prisma.activityFeedState.upsert({
      where: { userId: viewerId },
      create: { userId: viewerId, lastVisitedAt: visitedAt },
      update: { lastVisitedAt: visitedAt },
      select: { lastVisitedAt: true },
    });
    return state.lastVisitedAt;
  }

  private reason(
    actorId: string,
    metadata: ActivityEntry['metadata'],
    viewerId: string | undefined,
    followingIds: Set<string>,
    interests: Set<string>,
  ): ActivityFeedReason {
    if (viewerId && actorId === viewerId) return 'OWN_ACTIVITY';
    if (viewerId && metadata?.mentionedUserId === viewerId) return 'MENTION';
    if (followingIds.has(actorId)) return 'FOLLOWING';
    const tags = typeof metadata?.tags === 'string' ? metadata.tags : '';
    if (
      tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .some((tag) => interests.has(tag))
    ) {
      return 'INTEREST';
    }
    return 'RECENT';
  }

  private score(
    reason: ActivityFeedReason,
    occurredAt: Date,
    generatedAt: Date,
  ): number {
    const weights: Record<ActivityFeedReason, number> = {
      MENTION: 500,
      FOLLOWING: 400,
      INTEREST: 300,
      OWN_ACTIVITY: 200,
      RECENT: 100,
    };
    const ageHours = Math.max(
      0,
      (generatedAt.getTime() - occurredAt.getTime()) / 3_600_000,
    );
    return Math.round((weights[reason] + 100 / (1 + ageHours)) * 1000) / 1000;
  }

  private metadata(value: Prisma.JsonValue | null): ActivityEntry['metadata'] {
    if (!value || Array.isArray(value) || typeof value !== 'object')
      return null;
    const safe = Object.entries(value).filter((entry) => {
      const item = entry[1];
      return (
        item === null ||
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean'
      );
    });
    return Object.fromEntries(safe) as ActivityEntry['metadata'];
  }
}

/**
 * A projection may be rebuilt; a leaked secret cannot be un-leaked.
 */
