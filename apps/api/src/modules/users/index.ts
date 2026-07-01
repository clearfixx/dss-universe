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
 * • exports UsersService;
 * • exports the repository token and contract used by Auth.
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
export { UsersService } from './application/services/users.service';

export {
  USERS_REPOSITORY,
  type UsersRepository,
} from './domain/repositories/users.repository.interface';

/* -----------------------------------------------------------------------------
 * 🚀 Public APIs should be small, boring, and stable.
 * That is a compliment.
 * -----------------------------------------------------------------------------
 */
