/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/contracts/reputation-entry-reader.port.ts
 *
 * 🎯 Purpose:
 * Defines owned entry/history reads with composed public actor presentation and no ORM context.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  ReputationEntry,
  ReputationHistory,
} from '../domain/types/reputation.type';

export const REPUTATION_ENTRY_READER = Symbol('REPUTATION_ENTRY_READER');

export interface ReputationEntryReader {
  findOriginalById(id: string): Promise<ReputationEntry | null>;
  history(
    recipientId: string,
    page: number,
    limit: number,
  ): Promise<ReputationHistory>;
}
