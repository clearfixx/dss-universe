/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication Persistence
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-profile-account.shape.ts
 *
 * 🎯 Purpose:
 * Defines only account-owned presentation fields and predicates for guarded profile query assembly.
 *
 * 🧠 Responsibilities:
 * • selects exactly email/status/emailVerifiedAt, never credentials or session state;
 * • owns email lookup and the existing ACTIVE/profile-directory state predicates.
 *
 * 🏗️ Architecture:
 * Pure operation-specific infrastructure fragments; presentation facts are not authoritative access decisions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const profileAccountSelect = Object.freeze({
  email: true,
  status: true,
  emailVerifiedAt: true,
} as const);
export function profileAccountByEmail(email: string) {
  return { email };
}
export function activeProfileAccount() {
  return { status: 'ACTIVE' as const };
}
export function profileAccountState(
  status: 'ACTIVE' | 'DEACTIVATED' | 'BANNED' | 'DELETED' | undefined,
) {
  return { status };
}
