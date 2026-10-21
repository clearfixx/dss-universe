/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/contracts/authentication-flows.contract.ts
 *
 * 🎯 Purpose:
 * Publishes credential/session flows with opaque results and no profile aggregate.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { AuthClient } from '../application/types/auth-client.type';
import type { TokenPair } from '../application/types/token-pair.type';
import type { CredentialSubjectStore } from './credential-subject-store.contract';

export type AuthenticationResult = Readonly<{
  subjectId: string;
  tokens: TokenPair;
}>;
export type LoginCredentials = Readonly<{
  email: string;
  password: string;
  twoFactorCode?: string;
}>;

export interface AuthenticationFlows {
  enroll(
    email: string,
    password: string,
    store: CredentialSubjectStore,
  ): Promise<string>;
  completeRegistration(
    subjectId: string,
    client?: AuthClient,
  ): Promise<AuthenticationResult>;
  login(
    credentials: LoginCredentials,
    client?: AuthClient,
  ): Promise<AuthenticationResult>;
  refresh(
    input: Readonly<{ refreshToken: string }>,
  ): Promise<AuthenticationResult>;
  reactivateAccount(
    credentials: LoginCredentials,
    client?: AuthClient,
  ): Promise<AuthenticationResult>;
}

export const AUTHENTICATION_FLOWS = Symbol('AUTHENTICATION_FLOWS');
