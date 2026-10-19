/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication Persistence Composition
 * 📄 File: apps/api/src/modules/auth/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes owned ID readers and allowlisted account fragments for guarded root infrastructure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { credentialEnrollmentData } from './infrastructure/repositories/prisma-credential-enrollment.shape';
export {
  leaderboardSubjectSource,
  leaderboardSubjectId,
  leaderboardSubjectAge,
  leaderboardSubjectEligibility,
} from './infrastructure/repositories/leaderboard-subject.sql';
export { PrismaActiveSubjectSelector } from './infrastructure/repositories/prisma-active-subject.selector';
export { PrismaTransactionalSubjectExistenceReader } from './infrastructure/repositories/prisma-transactional-subject-existence.reader';
export {
  profileAccountSelect,
  profileAccountByEmail,
  activeProfileAccount,
  profileAccountState,
} from './infrastructure/repositories/prisma-profile-account.shape';
export {
  subjectAnchorSelect,
  subjectById,
} from './infrastructure/repositories/prisma-subject-anchor.shape';
