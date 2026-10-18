/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Persistence Composition
 * 📄 File: apps/api/src/modules/users/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes allowlisted technical profile adapters solely for guarded root composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { leaderboardProfileColumns } from './infrastructure/repositories/leaderboard-profile.sql';
export { PrismaPublicProfileReader } from './infrastructure/repositories/prisma-public-profile.reader';
export { PrismaTransactionalProfileExistenceReader } from './infrastructure/repositories/prisma-transactional-profile-existence.reader';
export {
  usersProfileSelect,
  profileById,
  profileByUsername,
  profilesByIds,
  profileDirectoryQuery,
  profileUpdateData,
} from './infrastructure/repositories/prisma-profile-persistence.shape';
export { PrismaReputationActorReader } from './infrastructure/repositories/prisma-reputation-actor.reader';
export { PrismaReputationWriteActorReader } from './infrastructure/repositories/prisma-reputation-write-actor.reader';
export { PrismaMentionProfileSelector } from './infrastructure/repositories/prisma-mention-profile.selector';
export {
  MentionRecipientMatcher,
  type MentionProfileCandidate,
} from './infrastructure/matching/mention-recipient.matcher';
