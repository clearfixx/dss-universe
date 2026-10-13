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
export { AuthModule } from './auth.module';
export {
  ACCESS_TOKEN_ISSUER,
  type AccessTokenIssuer,
} from './contracts/access-token-issuer.contract';
export type { TokenSubject } from './contracts/token-subject.type';
export {
  AUTHENTICATION_FLOWS,
  type AuthenticationFlows,
  type AuthenticationResult,
  type LoginCredentials,
} from './contracts/authentication-flows.contract';
export type { CredentialSubjectStore } from './contracts/credential-subject-store.contract';
export type { AuthClient } from './application/types/auth-client.type';
export { AUTH_ERRORS } from './domain/constants/auth-errors.constant';
export {
  AUTH_SUBJECT_ELIGIBILITY,
  type AuthSubjectEligibility,
} from './contracts/subject-eligibility.contract';
