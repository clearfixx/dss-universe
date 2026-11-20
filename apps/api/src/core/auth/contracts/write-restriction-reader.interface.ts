/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core / Authentication
 * 📄 File: apps/api/src/core/auth/contracts/write-restriction-reader.interface.ts
 *
 * 🎯 Purpose:
 * Declares the technical write-restriction fact used by request enforcement.
 *
 * ⚠️ Important:
 * Core does not know why a subject is restricted; the owning feature binds this.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface WriteRestrictionReader {
  restrictedUntil(subjectId: string, at: Date): Promise<Date | null>;
}

export const WRITE_RESTRICTION_READER = Symbol('WRITE_RESTRICTION_READER');
