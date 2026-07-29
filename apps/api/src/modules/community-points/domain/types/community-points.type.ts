/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/domain/types/community-points.type.ts
 *
 * 🎯 Purpose:
 * Defines explainable Community Points ledger, rule and consumption contracts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type CommunityPointEntry = {
  id: string;
  userId: string;
  ruleKey: string;
  points: number;
  reason: string;
  sourceEventId: string | null;
  sourceEventName: string | null;
  sourceType: string | null;
  sourceId: string | null;
  actorId: string | null;
  occurredAt: Date;
  reversal: CommunityPointReversal | null;
};

export type CommunityPointReversal = {
  id: string;
  actorId: string | null;
  reason: string;
  occurredAt: Date;
};

export type CommunityPointHistory = {
  items: CommunityPointEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  balance: number;
};

export type CommunityPointRule = {
  key: string;
  eventName: string;
  payloadValue: number | null;
  points: number;
  dailyLimit: number | null;
  enabled: boolean;
  updatedById: string | null;
  updatedAt: Date;
};

export type CommunityPointEvent = {
  eventId: string;
  eventName: string;
  eventVersion: number;
  occurredAt: Date;
  actorId?: string;
  aggregateType?: string;
  aggregateId?: string;
  payload: Record<string, unknown>;
};

export type CommunityPointAwardInput = {
  event: CommunityPointEvent;
  userId: string;
  rule: CommunityPointRule;
  reason: string;
};

export type CommunityPointConsumption = {
  status: 'AWARDED' | 'DUPLICATE' | 'IGNORED' | 'CAPPED';
  entry: CommunityPointEntry | null;
};

export type CommunityPointSourceReversal = {
  entries: CommunityPointEntry[];
  duplicate: boolean;
};

/**
 * A balance is a projection. The ledger is the memory.
 */
