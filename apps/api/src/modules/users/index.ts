/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/index.ts
 *
 * 🎯 Purpose:
 * Defines the public API surface of the Users module.
 *
 * 🧠 Responsibilities:
 * • exports UsersModule;
 * • publishes narrow profile, display and existence contracts;
 * • keeps concrete services and persistence contracts private.
 *
 * 🏗️ Architecture:
 * Public module API. Other modules should import Users through this file.
 *
 * ⚠️ Important:
 * Do not export Prisma repository implementations from here.
 *
 * 💡 Notes:
 * Public exports are small doors into large systems.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { UsersModule } from './users.module';
export {
  WALL_IMAGE_ELIGIBILITY,
  type WallImageEligibility,
} from './domain/ports/wall-image-eligibility.interface';
export {
  PROFILE_EXISTENCE_READER,
  type ProfileExistenceReader,
} from './contracts/profile-existence.contract';
export {
  VIEWER_PROFILE_READER,
  type ViewerProfileReader,
  type ViewerProfile,
} from './contracts/viewer-profile.contract';
export {
  PROFILE_DISPLAY_READER,
  type ProfileDisplayReader,
} from './contracts/profile-display-reader.contract';
export { USER_ERRORS } from './domain/constants/user-errors.constant';

/* -----------------------------------------------------------------------------
 * 🚀 Public APIs should be small, boring, and stable.
 * That is a compliment.
 * -----------------------------------------------------------------------------
 */
export { PROFILE_GROUP_DISPLAY } from './contracts/profile-group-display.contract';
export type {
  ProfileGroupDisplayReader,
  ProfileGroupDisplay,
} from './contracts/profile-group-display.contract';
export {
  USER_BLOCK_DECISIONS,
  type UserBlockDecisionReader,
} from './contracts/block-decision.contract';
export { PROFILE_WALL_INTERACTION_KIND } from './domain/constants/profile-wall-interaction.constant';
export {
  PROFILE_WALL_TRANSACTION,
  type ProfileWallTransaction,
  type ProfileWallWriteResult,
  type CreateUserWallPost,
} from './domain/ports/profile-wall-transaction.interface';
export {
  PROFILE_WALL_INTERACTION_DECISIONS,
  type ProfileWallInteractionDecisions,
  type ProfileWallInteractionRequest,
  type ProfileWallInteractionDecision,
} from './contracts/profile-wall-interaction-decisions.contract';
export {
  PROFILE_ACTIVITY_READER,
  type ProfileActivityReader,
  type ProfileActivityItem,
} from './domain/ports/profile-activity-reader.interface';
