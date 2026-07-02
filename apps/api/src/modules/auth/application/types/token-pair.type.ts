/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/types/token-pair.type.ts
 *
 * 🎯 Purpose:
 * Defines the JWT token pair issued by the Authentication module.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
