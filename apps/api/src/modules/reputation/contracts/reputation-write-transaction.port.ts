/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/contracts/reputation-write-transaction.port.ts
 *
 * 🎯 Purpose:
 * Defines atomic ledger commands with composed public responses, never ORM clients or callbacks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  CreateReputationEntry,
  ReputationEntry,
  ReputationValue,
} from '../domain/types/reputation.type';

export const REPUTATION_WRITE_TRANSACTION = Symbol(
  'REPUTATION_WRITE_TRANSACTION',
);
export interface ReputationWriteTransaction {
  createDirect(input: CreateReputationEntry): Promise<ReputationEntry | null>;
  reverse(
    entryId: string,
    actorId: string,
    recipientId: string,
    value: ReputationValue,
    reason: string,
  ): Promise<ReputationEntry | null>;
}
