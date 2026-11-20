/**
 * DSS File Passport
 * File: apps/api/src/modules/research-lab/domain/errors/research-lab-command.error.ts
 * Purpose: Typed, framework-neutral failures for Research Lab write commands.
 */
export type ResearchLabCommandErrorCode =
  | 'ACCESS_DENIED'
  | 'DRAFT_CONFLICT'
  | 'NOT_FOUND'
  | 'REVISION_CONFLICT'
  | 'INVALID_STATE';

export class ResearchLabCommandError extends Error {
  constructor(
    public readonly code: ResearchLabCommandErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ResearchLabCommandError';
  }
}
