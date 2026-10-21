/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements
 * 📄 File: apps/api/src/modules/achievements/contracts/recipient-existence.port.ts
 *
 * 🎯 Purpose:
 * Defines recipient existence without importing another feature service.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface AchievementRecipientExistence {
  exists(subjectId: string): Promise<boolean>;
}
export const ACHIEVEMENT_RECIPIENT_EXISTENCE = Symbol(
  'ACHIEVEMENT_RECIPIENT_EXISTENCE',
);
