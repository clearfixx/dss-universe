/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/types/account-credentials.type.ts
 *
 * 🎯 Purpose:
 * Defines the Auth-private credential and eligibility snapshot for an opaque subject.
 *
 * ⚠️ Important:
 * Contains a password hash. Never expose through profiles, transport or events.
 * No display name, username, avatar or other profile data belongs here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type AccountCredentials = Readonly<{
  id: string;
  email: string;
  passwordHash: string;
  status: 'ACTIVE' | 'DEACTIVATED' | 'BANNED' | 'DELETED';
  authVersion: number;
  loginFailedAttempts: number;
  loginLockedUntil: Date | null;
}>;
