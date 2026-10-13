/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/types/access-session-state.type.ts
 *
 * 🎯 Purpose:
 * Defines the authentication-owned session eligibility state without profile or secret data.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type AccessSessionState = Readonly<{
  subjectId: string;
  revokedAt: Date | null;
  expiresAt: Date;
  accountActive: boolean;
  authVersion: number;
}>;
