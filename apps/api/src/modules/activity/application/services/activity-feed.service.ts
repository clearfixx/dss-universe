/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/application/services/activity-feed.service.ts
 *
 * 🎯 Purpose:
 * Composes bounded Activity reads with minimal viewer context and owned ranking policy.
 *
 * 🧠 Responsibilities:
 * • normalizes filters and pagination before owned projection reads;
 * • orders visit/context/candidate reads and delegates deterministic ranking.
 *
 * 🏗️ Architecture:
 * Activity application use case; Users facts enter through an Activity-owned port.
 *
 * ⚠️ Important:
 * Guests never read viewer context; owner failures must not produce an empty successful feed.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';

import type { PaginatedResult } from '@api/shared';

import {
  ACTIVITY_REPOSITORY,
  type ActivityRepository,
} from '../../domain/repositories/activity.repository.interface';
import type {
  ActivityEntry,
  ActivityFeedPage,
  ActivityFeedQuery,
} from '../../domain/types/activity-entry.type';
import {
  ACTIVITY_VIEWER_CONTEXT,
  type ActivityViewerContextReader,
} from '../../domain/ports/activity-viewer-context.interface';
import { ActivityFeedRankerService } from './activity-feed-ranker.service';

@Injectable()
export class ActivityFeedService {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly activity: ActivityRepository,
    @Inject(ACTIVITY_VIEWER_CONTEXT)
    private readonly context: ActivityViewerContextReader,
    private readonly ranker: ActivityFeedRankerService,
  ) {}

  byActor(
    actorId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<ActivityEntry>> {
    return this.activity.findByActor(
      actorId,
      Math.max(1, page),
      Math.min(50, Math.max(1, limit)),
    );
  }

  publicFeed(
    modules?: string[],
    page = 1,
    limit = 20,
  ): Promise<ActivityFeedPage> {
    return this.findFeed({
      modules: this.modules(modules),
      page: Math.max(1, page),
      limit: Math.min(50, Math.max(1, limit)),
    });
  }

  personalizedFeed(
    viewerId: string,
    modules?: string[],
    page = 1,
    limit = 20,
  ): Promise<ActivityFeedPage> {
    return this.findFeed({
      viewerId,
      modules: this.modules(modules),
      page: Math.max(1, page),
      limit: Math.min(50, Math.max(1, limit)),
    });
  }

  markVisited(viewerId: string): Promise<Date> {
    return this.activity.markVisited(viewerId, new Date());
  }

  private async findFeed(query: ActivityFeedQuery): Promise<ActivityFeedPage> {
    const generatedAt = new Date();
    const lastVisitedAt = query.viewerId
      ? await this.activity.lastVisitedAt(query.viewerId)
      : null;
    const context = query.viewerId
      ? await this.context.readForViewer(query.viewerId)
      : { interests: [], followingIds: [], blockedIds: [] };
    const candidates = await this.activity.findFeedCandidates(
      query,
      context.blockedIds,
    );
    return this.ranker.rank(
      candidates,
      query,
      context,
      lastVisitedAt,
      generatedAt,
    );
  }

  private modules(modules?: string[]): string[] | undefined {
    const normalized = [
      ...new Set(
        modules?.map((item) => item.trim().toUpperCase()).filter(Boolean),
      ),
    ];
    return normalized.length ? normalized.slice(0, 12) : undefined;
  }
}

/**
 * One read model, many future producers. That is the whole point of a feed.
 */
