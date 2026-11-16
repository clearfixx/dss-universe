/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements Persistence Composition
 * 📄 File: apps/api/src/modules/achievements/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes only the stateless manual writer for guarded root transaction assembly.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { PrismaManualAwardWriter } from './infrastructure/repositories/prisma-manual-award.writer';
export {
  ACHIEVEMENT_RULE_DELIVERY_GUARD,
  type AchievementRuleDeliveryGuard,
} from './infrastructure/rule-delivery-guard';
export { AchievementRuleDeliveryConfigurationError } from './domain/errors/rule-delivery-configuration.error';
