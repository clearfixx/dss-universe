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
 * • retains explicitly visible legacy exports until remaining D4 consumers migrate.
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
export { UsersService } from './application/services/users.service';
export { UserBlockService } from './application/services/user-block.service';

export {
  USERS_REPOSITORY,
  type UsersRepository,
} from './domain/repositories/users.repository.interface';

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
