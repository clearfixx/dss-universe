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
