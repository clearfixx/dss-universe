/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/contracts/ban-transaction.port.ts
 *
 * 🎯 Purpose:
 * Atomic ban commands: the ban record and the account change together.
 *
 * ⚠️ Important:
 * Root composition implements it; no ORM client or callback crosses it.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  AccountBanRecord,
  NewAccountBan,
} from '../domain/types/account-ban.type';

export interface BanTransaction {
  /** Null when the account cannot be banned (already banned or deleted). */
  issue(ban: NewAccountBan): Promise<AccountBanRecord | null>;
  /** Null when the ban was already lifted. */
  lift(
    banId: string,
    actorId: string,
    reason: string,
  ): Promise<AccountBanRecord | null>;
  /** The banned subject of a valid login ticket. */
  ticketSubject(ticket: string): Promise<string | null>;
}

export const BAN_TRANSACTION = Symbol('BAN_TRANSACTION');
