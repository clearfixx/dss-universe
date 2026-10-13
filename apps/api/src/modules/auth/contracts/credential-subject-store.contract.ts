/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/contracts/credential-subject-store.contract.ts
 *
 * 🎯 Purpose:
 * Defines the trusted credential write adapter used during atomic enrollment.
 *
 * ⚠️ Important:
 * Hashes are write-only infrastructure input, never business responses or events.
 * Implementations return only the opaque subject ID; no Prisma client crosses here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface CredentialSubjectStore {
  create(
    credentials: Readonly<{ email: string; passwordHash: string }>,
  ): Promise<string>;
}
