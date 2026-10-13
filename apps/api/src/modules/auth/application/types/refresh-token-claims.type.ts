/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/types/refresh-token-claims.type.ts
 *
 * 🎯 Purpose:
 * Defines only subject, session and version facts carried by refresh tokens.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type RefreshTokenClaims = Readonly<{
  sub: string;
  sid: string;
  ver: number;
}>;
