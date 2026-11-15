/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Persistence Composition
 * 📄 File: apps/api/src/modules/reputation/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes owned ledger and qualification adapters for guarded root composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { leaderboardReputationAggregate } from './infrastructure/repositories/leaderboard-reputation.sql';
export { PrismaReputationQualificationReader } from './infrastructure/repositories/prisma-reputation-qualification.reader';
export {
  PrismaReputationQualificationWriter,
  type ReputationOriginalEvidenceLookup,
  type ReputationOriginalEvidenceInput,
} from './infrastructure/repositories/prisma-reputation-qualification.writer';
export {
  PrismaReputationEntryReader,
  type ReputationEntryFact,
  type ReputationReversalFact,
} from './infrastructure/repositories/prisma-reputation-entry.reader';
export {
  PrismaReputationWriter,
  type ReputationEntryProjection,
} from './infrastructure/repositories/prisma-reputation.writer';
