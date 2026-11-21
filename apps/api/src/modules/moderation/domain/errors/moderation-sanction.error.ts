/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/domain/errors/moderation-sanction.error.ts
 *
 * 🎯 Purpose:
 * Reports sanction command failures without transport coupling.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ModerationSanctionErrorCode =
  | 'ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'INVALID_STATE';

export class ModerationSanctionError extends Error {
  constructor(
    readonly code: ModerationSanctionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ModerationSanctionError';
  }
}
