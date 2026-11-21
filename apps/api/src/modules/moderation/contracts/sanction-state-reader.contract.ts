/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/contracts/sanction-state-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes the narrow current-restriction fact consumed by enforcement points.
 *
 * ⚠️ Important:
 * Consumers learn only whether and until when a subject is read-only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface SanctionStateReader {
  readOnlyUntil(subjectId: string, at: Date): Promise<Date | null>;
}

export const SANCTION_STATE_READER = Symbol('SANCTION_STATE_READER');
