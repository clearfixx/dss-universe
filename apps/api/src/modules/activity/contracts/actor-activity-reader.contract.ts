/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/contracts/actor-activity-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes bounded actor activity summaries without metadata or content payloads.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PaginatedResult } from '@api/shared';
export type ActorActivitySummary = Readonly<{
  id: string;
  actorId: string;
  module: string;
  action: string;
  subjectType: string;
  subjectId: string;
  occurredAt: Date;
}>;
export interface ActorActivityReader {
  byActor(
    actorId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<ActorActivitySummary>>;
}
export const ACTOR_ACTIVITY_READER = Symbol('ACTOR_ACTIVITY_READER');
