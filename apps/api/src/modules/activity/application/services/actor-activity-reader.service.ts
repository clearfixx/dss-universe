/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/application/services/actor-activity-reader.service.ts
 *
 * 🎯 Purpose:
 * Projects only actor-summary fields from the owned bounded activity read use case.
 *
 * 🧠 Responsibilities:
 * • delegates bounded/filtering reads to the owned Activity use case;
 * • selects only actor summary fields and copies timestamps.
 *
 * 🏗️ Architecture:
 * Private Activity projection adapter; consumer profile/privacy checks stay in Users.
 *
 * ⚠️ Important:
 * No metadata/body field or empty-success fallback may cross the public contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { PaginatedResult } from '@api/shared';
import type {
  ActorActivityReader,
  ActorActivitySummary,
} from '../../contracts/actor-activity-reader.contract';
import { ActivityFeedService } from './activity-feed.service';

@Injectable()
export class ActorActivityReaderService implements ActorActivityReader {
  constructor(private readonly feed: ActivityFeedService) {}
  async byActor(
    actorId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<ActorActivitySummary>> {
    const result = await this.feed.byActor(actorId, page, limit);
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
