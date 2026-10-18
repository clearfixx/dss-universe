/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: auth
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/leaderboard-subject.sql.ts
 *
 * 🎯 Purpose:
 * Provides only owned, operation-specific SQL for guarded one-statement ranking composition.
 *
 * ⚠️ Important:
 * Fixed aliases and trusted infrastructure expressions only; never accept raw user SQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';

export const leaderboardSubjectSource = Prisma.sql`"users" users`;
export const leaderboardSubjectId = Prisma.sql`users."id"`;
export const leaderboardSubjectAge = Prisma.sql`users."createdAt"`;
export const leaderboardSubjectEligibility = Prisma.sql`users."status" = 'ACTIVE'`;
