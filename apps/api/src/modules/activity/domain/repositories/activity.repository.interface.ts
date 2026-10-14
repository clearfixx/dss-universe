/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/domain/repositories/activity.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines the read boundary for projected activity entries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { PaginatedResult } from '@api/shared';

import type {
  ActivityEntry,
  ActivityFeedQuery,
} from '../types/activity-entry.type';

export const ACTIVITY_REPOSITORY = Symbol('ACTIVITY_REPOSITORY');

export interface ActivityRepository {
  findByActor(
    actorId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ActivityEntry>>;
  lastVisitedAt(viewerId: string): Promise<Date | null>;
  findFeedCandidates(
    query: ActivityFeedQuery,
    blockedActorIds: readonly string[],
  ): Promise<ActivityEntry[]>;
  markVisited(viewerId: string, visitedAt: Date): Promise<Date>;
}

/**
 * Projections are replaceable. The repository boundary keeps that promise.
 */
