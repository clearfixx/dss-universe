/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Persistence Composition
 * 📄 File: apps/api/src/modules/reputation/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes only owned stateless ledger adapters for guarded root composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export {
  PrismaReputationEntryReader,
  type ReputationEntryFact,
  type ReputationReversalFact,
} from './infrastructure/repositories/prisma-reputation-entry.reader';
export {
  PrismaReputationWriter,
  type ReputationEntryProjection,
} from './infrastructure/repositories/prisma-reputation.writer';
