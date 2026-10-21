/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels
 * 📄 File: apps/api/src/modules/levels/contracts/recipient-existence.port.ts
 *
 * 🎯 Purpose:
 * Defines profile existence as an owned input to level policies.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface LevelRecipientExistence {
  exists(subjectId: string): Promise<boolean>;
}
export const LEVEL_RECIPIENT_EXISTENCE = Symbol('LEVEL_RECIPIENT_EXISTENCE');
