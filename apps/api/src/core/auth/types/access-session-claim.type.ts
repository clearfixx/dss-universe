/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Authentication
 * 📄 File: apps/api/src/core/auth/types/access-session-claim.type.ts
 *
 * 🎯 Purpose:
 * Defines the minimal subject/session/version evidence required for access validation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type AccessSessionClaim = Readonly<{
  subjectId: string;
  sessionId: string;
  authVersion: number;
}>;
