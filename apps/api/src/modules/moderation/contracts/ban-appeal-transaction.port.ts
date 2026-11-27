/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/contracts/ban-appeal-transaction.port.ts
 *
 * 🎯 Purpose:
 * Atomic appeal commands that also touch other owners: screenshot
 * references and, on acceptance, the account itself.
 *
 * ⚠️ Important:
 * Root composition implements it; commands for one ban are serialized.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { BanAppealRecord } from '../domain/ban-appeal.rules';

export interface BanAppealTransaction {
  /** False when the appeal was already sent or a file limit is reached. */
  attach(banId: string, subjectId: string, mediaId: string): Promise<boolean>;
  /** False when the appeal was already sent or the file is not attached. */
  detach(banId: string, subjectId: string, fileId: string): Promise<boolean>;
  /** Null when this ban already has its appeal or is no longer in force. */
  submit(banId: string, text: string): Promise<BanAppealRecord | null>;
  /**
   * Null when the appeal was already decided or the ban already lifted.
   * Acceptance lifts the ban and restores the account.
   */
  decide(
    appealId: string,
    actorId: string,
    accept: boolean,
    reason: string,
  ): Promise<BanAppealRecord | null>;
}

export const BAN_APPEAL_TRANSACTION = Symbol('BAN_APPEAL_TRANSACTION');
