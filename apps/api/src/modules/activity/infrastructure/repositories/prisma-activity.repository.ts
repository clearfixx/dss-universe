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
import type { ActivityEntry } from '../../domain/types/activity-entry.type';

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
