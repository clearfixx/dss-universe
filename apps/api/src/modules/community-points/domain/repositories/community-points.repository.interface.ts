/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/domain/repositories/community-points.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence boundaries for event-derived Community Points.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  CommunityPointAwardInput,
  CommunityPointConsumption,
  CommunityPointEntry,
  CommunityPointHistory,
  CommunityPointRule,
  CommunityPointSourceReversal,
} from '../types/community-points.type';

export const COMMUNITY_POINTS_REPOSITORY = Symbol(
  'COMMUNITY_POINTS_REPOSITORY',
);

export interface CommunityPointsRepository {
  balance(userId: string): Promise<number>;
  rules(): Promise<CommunityPointRule[]>;
  matchingRules(
    eventName: string,
    payloadValue?: number,
  ): Promise<CommunityPointRule[]>;
  updateRule(
    key: string,
    points: number,
    dailyLimit: number | null,
    enabled: boolean,
    updatedById: string,
  ): Promise<CommunityPointRule | null>;
  award(input: CommunityPointAwardInput): Promise<CommunityPointConsumption>;
  findOriginalById(id: string): Promise<CommunityPointEntry | null>;
  reverse(
    entryId: string,
    actorId: string,
    reason: string,
    occurredAt: Date,
  ): Promise<CommunityPointEntry | null>;
  reverseSource(
    sourceType: string,
    sourceId: string,
    sourceEventId: string,
    actorId: string | undefined,
    reason: string,
    occurredAt: Date,
  ): Promise<CommunityPointSourceReversal>;
  history(
    userId: string,
    page: number,
    limit: number,
  ): Promise<CommunityPointHistory>;
}

/**
 * There is intentionally no update or delete method for ledger entries.
 */
