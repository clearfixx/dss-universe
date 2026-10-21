/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/infrastructure/repositories/achievement-award.shape.ts
 *
 * 🎯 Purpose:
 * Keeps the owned award/revocation persistence projection identical across write paths.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';

export const awardInclude = { achievement: true, revocation: true } as const;
export type AwardRow = Prisma.AchievementAwardGetPayload<{
  include: typeof awardInclude;
}>;
