/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/contracts/token-subject.type.ts
 *
 * 🎯 Purpose:
 * Defines opaque Auth-owned identity facts supplied to token issuance.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type TokenSubject = Readonly<{
  id: string;
  email: string;
  authVersion: number;
}>;
