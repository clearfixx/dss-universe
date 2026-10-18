/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles Persistence Composition
 * 📄 File: apps/api/src/modules/custom-titles/infrastructure.ts
 *
 * 🎯 Purpose:
 * Publishes owned title writes and selected-title SQL for guarded root assembly.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export {
  leaderboardTitleColumns,
  leaderboardTitleJoins,
} from './infrastructure/repositories/leaderboard-title.sql';
export { PrismaTitleGrantWriter } from './infrastructure/repositories/prisma-title-grant.writer';
