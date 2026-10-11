/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/index.ts
 *
 * 🎯 Purpose:
 * Publishes explicit authentication integration contracts, not internal services.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export {
  ACCESS_TOKEN_ISSUER,
  type AccessTokenIssuer,
} from './contracts/access-token-issuer.contract';
export type { TokenSubject } from './contracts/token-subject.type';
