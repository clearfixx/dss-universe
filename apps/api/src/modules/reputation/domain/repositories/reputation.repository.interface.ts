/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/domain/repositories/reputation.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines persistence boundaries for direct reputation and its policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  CreateReputationEntry,
  ReputationEntry,
  ReputationHistory,
  ReputationPolicy,
} from '../types/reputation.type';

export const REPUTATION_REPOSITORY = Symbol('REPUTATION_REPOSITORY');

export interface ReputationRepository {
  policy(): Promise<ReputationPolicy>;
  updatePolicy(
    minimumAccountAgeDays: number,
    updatedById: string,
  ): Promise<ReputationPolicy>;
  createDirect(input: CreateReputationEntry): Promise<ReputationEntry | null>;
  findOriginalById(id: string): Promise<ReputationEntry | null>;
  reverse(
    entryId: string,
    actorId: string,
    recipientId: string,
    value: -1 | 1,
    reason: string,
  ): Promise<ReputationEntry | null>;
  history(
    recipientId: string,
    page: number,
    limit: number,
  ): Promise<ReputationHistory>;
}

/**
 * The interface permits appends and policy updates; ledger rewrites are absent
 * on purpose.
 */
