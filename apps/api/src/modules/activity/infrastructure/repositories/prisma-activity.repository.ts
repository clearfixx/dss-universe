/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/infrastructure/repositories/prisma-activity.repository.ts
 *
 * 🎯 Purpose:
 * Reads only owned Activity projections and visit state from PostgreSQL.
 *
 * 🧠 Responsibilities:
 * • selects bounded, active candidates using Activity-owned visibility and block inputs;
 * • maps primitive metadata and retains owned visit/actor pagination persistence.
 *
 * 🏗️ Architecture:
 * Activity infrastructure; Users context enters its application through an owned port.
 *
 * ⚠️ Important:
 * Do not query Users tables here, change the 500-candidate cap or move ranking/unread policy into SQL.
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
  ActivityFeedQuery,
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

  async lastVisitedAt(viewerId: string): Promise<Date | null> {
    const state = await this.prisma.activityFeedState.findUnique({
      where: { userId: viewerId },
      select: { lastVisitedAt: true },
    });
    return state?.lastVisitedAt ?? null;
  }

  async findFeedCandidates(
    query: ActivityFeedQuery,
    blockedActorIds: readonly string[],
  ): Promise<ActivityEntry[]> {
    const blockedIds = new Set(blockedActorIds);
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
    return records.map((record) => ({
      id: record.id,
      actorId: record.actorId,
      module: record.module,
      action: record.action,
      subjectType: record.subjectType,
      subjectId: record.subjectId,
      visibility: record.visibility,
      metadata: this.metadata(record.metadata),
      occurredAt: record.occurredAt,
    }));
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
