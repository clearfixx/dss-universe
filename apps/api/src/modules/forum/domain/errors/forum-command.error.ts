/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/errors/forum-command.error.ts
 *
 * 🎯 Purpose:
 * Reports Forum command failures without transport coupling.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ForumCommandErrorCode =
  | 'ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'CONFLICT';

export class ForumCommandError extends Error {
  constructor(
    readonly code: ForumCommandErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ForumCommandError';
  }
}
