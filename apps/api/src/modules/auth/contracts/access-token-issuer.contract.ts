/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/contracts/access-token-issuer.contract.ts
 *
 * 🎯 Purpose:
 * Defines access-token issuance without importing profile or authorization data.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { TokenSubject } from './token-subject.type';

export interface AccessTokenIssuer {
  issue(subject: TokenSubject, sessionId: string): Promise<string>;
}

export const ACCESS_TOKEN_ISSUER = Symbol('ACCESS_TOKEN_ISSUER');
