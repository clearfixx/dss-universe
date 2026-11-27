/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/contracts/ban-tickets.contract.ts
 *
 * 🎯 Purpose:
 * Verifies the narrow ticket a banned account receives at login.
 *
 * ⚠️ Important:
 * A banned account never gets a session; the ticket only identifies it.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface AuthBanTickets {
  /** The subject of a valid ticket while the account is still banned. */
  subjectOf(ticket: string): Promise<string | null>;
}

export const AUTH_BAN_TICKETS = Symbol('AUTH_BAN_TICKETS');
