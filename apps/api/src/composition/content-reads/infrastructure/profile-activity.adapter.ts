/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/profile-activity.adapter.ts
 *
 * 🎯 Purpose:
 * Adapts only actor summaries to the Users-owned activity projection port.
 *
 * 🧠 Responsibilities:
 * • exposes only the operation-specific data required by its consumer;
 * • preserves owner validation and propagates failures without defaults.
 *
 * 🏗️ Architecture:
 * Narrow dependency boundary; policy and persistence stay with their owners.
 *
 * ⚠️ Important:
 * No credentials, gate aggregate or ORM transaction crosses this boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import type { PaginatedResult } from '@api/shared';
import {
  ACTOR_ACTIVITY_READER,
  type ActorActivityReader,
} from '@api/modules/activity';
import type {
  ProfileActivityReader,
  ProfileActivityItem,
} from '@api/modules/users';

@Injectable()
export class ProfileActivityAdapter implements ProfileActivityReader {
  constructor(
    @Inject(ACTOR_ACTIVITY_READER)
    private readonly activity: ActorActivityReader,
  ) {}
  async byActor(
    actorId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<ProfileActivityItem>> {
    const result = await this.activity.byActor(actorId, page, limit);
    return {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      items: result.items.map((entry) => ({
        id: entry.id,
        actorId: entry.actorId,
        module: entry.module,
        action: entry.action,
        subjectType: entry.subjectType,
        subjectId: entry.subjectId,
        occurredAt: new Date(entry.occurredAt),
      })),
    };
  }
}
