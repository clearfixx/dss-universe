/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/domain/ban-appeal.rules.ts
 *
 * 🎯 Purpose:
 * Limits of a ban appeal and its facts (owner 2026-11-27).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ModerationSanctionError } from './errors/moderation-sanction.error';

/** Screenshots attached to an appeal at once. */
export const APPEAL_MAX_FILES = 5;
/** Uploads per ban, removed ones included, so storage cannot be flooded. */
export const APPEAL_MAX_UPLOADS = 10;

export type BanAppealStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type BanAppealRecord = {
  id: string;
  banId: string;
  text: string;
  status: BanAppealStatus;
  submittedAt: Date;
  decidedAt: Date | null;
  decidedById: string | null;
  decisionReason: string | null;
};

export function normalizeAppealText(value: string): string {
  const text = value.trim();
  if (text.length < 3 || text.length > 1000)
    throw new ModerationSanctionError(
      'INVALID_INPUT',
      'An appeal must contain 3 to 1000 characters.',
    );
  return text;
}

/** Whether one more screenshot may be uploaded. */
export function canAddAppealFile(attached: number, uploaded: number): boolean {
  return attached < APPEAL_MAX_FILES && uploaded < APPEAL_MAX_UPLOADS;
}
