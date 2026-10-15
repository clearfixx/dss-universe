/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication Persistence Composition
 * 📄 File: apps/api/src/modules/auth/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes only owned active-ID and allowlisted account presentation fragments for guarded root infrastructure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { PrismaActiveSubjectSelector } from './infrastructure/repositories/prisma-active-subject.selector';
export {
  profileAccountSelect,
  profileAccountByEmail,
  activeProfileAccount,
  profileAccountState,
} from './infrastructure/repositories/prisma-profile-account.shape';
