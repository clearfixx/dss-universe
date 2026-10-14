/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation
 * 📄 File: apps/api/src/modules/reputation/index.ts
 *
 * 🎯 Purpose:
 * Exposes the stable public boundary of the Reputation module.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { ReputationModule } from './reputation.module';
export {
  REPUTATION_TOTAL_READER,
  type ReputationTotalReader,
} from './contracts/reputation-total-reader.contract';
export {
  REPUTATION_ACCOUNT_READER,
  type ReputationAccountReader,
  type ReputationAccountEvidence,
} from './contracts/account-evidence.port';
export {
  REPUTATION_BLOCK_READER,
  type ReputationBlockReader,
} from './contracts/block-decision.port';
export {
  REPUTATION_PROFILE_EXISTENCE,
  type ReputationProfileExistence,
} from './contracts/profile-existence.port';

/**
 * Small public doors keep large ledgers from leaking into the corridor.
 */
