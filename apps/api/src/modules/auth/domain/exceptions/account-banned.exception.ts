/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/exceptions/account-banned.exception.ts
 *
 * 🎯 Purpose:
 * Raised only after the password (and second factor) of a banned account
 * were proven; carries the narrow ban ticket.
 *
 * ⚠️ Important:
 * Never throw it before the credentials are verified: that would reveal
 * which accounts are banned.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export class AccountBannedException extends Error {
  constructor(readonly banTicket: string) {
    super('ACCOUNT_BANNED');
    this.name = AccountBannedException.name;
  }
}
