/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/domain/types/reputation.type.ts
 *
 * 🎯 Purpose:
 * Defines append-only direct reputation records and policy contracts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type ReputationValue = -1 | 1;

export type ReputationActor = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type ReputationReversal = {
  id: string;
  actor: ReputationActor;
  reason: string;
  createdAt: Date;
};

export type ReputationEntry = {
  id: string;
  actor: ReputationActor;
  recipientId: string;
  value: ReputationValue;
  reason: string;
  createdAt: Date;
  reversal: ReputationReversal | null;
};

export type ReputationHistory = {
  items: ReputationEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  score: number;
};

export type ReputationPolicy = {
  minimumAccountAgeDays: number;
  updatedById: string | null;
  updatedAt: Date;
};

export type CreateReputationEntry = {
  actorId: string;
  recipientId: string;
  value: ReputationValue;
  reason: string;
  cooldownStartedAfter: Date;
};

/**
 * Reputation is a ledger, not an eraser. Every correction leaves coordinates.
 */
