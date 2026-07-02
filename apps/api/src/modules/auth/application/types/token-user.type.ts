/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/types/token-user.type.ts
 *
 * 🎯 Purpose:
 * Defines the minimal authenticated user shape required for token issuing.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type TokenUser = {
  id: string;
  email: string;
  username: string;
};
