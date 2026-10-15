/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/contracts/manual-award-transaction.port.ts
 *
 * 🎯 Purpose:
 * Defines an atomic manual award command without exposing persistence or recipient callbacks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { AchievementAwardResult } from '../domain/types/achievements.type';

export type ManualAchievementAward = Readonly<{
  userId: string;
  achievementId: string;
  reason: string;
  actorId: string;
}>;
export interface ManualAwardTransaction {
  award(input: ManualAchievementAward): Promise<AchievementAwardResult>;
}
export const MANUAL_AWARD_TRANSACTION = Symbol('MANUAL_AWARD_TRANSACTION');
