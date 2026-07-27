/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/application/services/activity-feed.service.ts
 *
 * 🎯 Purpose:
 * Exposes bounded reads from the cross-module activity projection.
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
import type { ActivityEntry } from '../../domain/types/activity-entry.type';

@Injectable()
export class ActivityFeedService {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly activity: ActivityRepository,
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
}

/**
 * One read model, many future producers. That is the whole point of a feed.
 */
