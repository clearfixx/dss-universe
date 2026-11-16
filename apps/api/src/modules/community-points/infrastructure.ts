/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: community-points
 * 📄 File: apps/api/src/modules/community-points/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes owned ranking SQL and transaction-bound balance reads for guarded root infrastructure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { leaderboardPointsAggregate } from './infrastructure/repositories/leaderboard-points.sql';
export { PrismaTransactionalPointsBalanceReader } from './infrastructure/repositories/prisma-transactional-points-balance.reader';
export { PrismaPointLedgerEvidenceReader } from './infrastructure/repositories/prisma-point-ledger-evidence.reader';
export {
  POINT_RULE_DELIVERY_GUARD,
  type PointRuleDeliveryGuard,
} from './infrastructure/rule-delivery-guard';
export { PointRuleDeliveryConfigurationError } from './domain/errors/rule-delivery-configuration.error';
export { PrismaPointRuleConfigurationReader } from './infrastructure/repositories/prisma-point-rule-configuration.reader';
