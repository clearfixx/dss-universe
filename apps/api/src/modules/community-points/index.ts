/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/index.ts
 *
 * 🎯 Purpose:
 * Exposes the public Community Points module boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { CommunityPointsModule } from './community-points.module';
export {
  COMMUNITY_POINTS_BALANCE_READER,
  type CommunityPointsBalanceReader,
} from './contracts/balance-reader.contract';
export {
  POINTS_RECIPIENT_EXISTENCE,
  type PointsRecipientExistence,
} from './contracts/recipient-existence.port';

/**
 * Keep this airlock narrow: implementation details stay inside the module.
 */
