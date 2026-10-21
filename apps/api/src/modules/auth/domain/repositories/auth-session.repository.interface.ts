/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/repositories/auth-session.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines the persistence boundary for authenticated sessions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  AuthSession,
  CreateAuthSession,
} from '../types/auth-session.type';

export interface AuthSessionRepository {
  create(input: CreateAuthSession): Promise<AuthSession>;
  findActive(id: string, userId: string): Promise<AuthSession | null>;
  listActive(userId: string): Promise<AuthSession[]>;
  rotate(
    id: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<AuthSession>;
  revoke(id: string, userId: string): Promise<boolean>;
  revokeOthers(userId: string, currentSessionId: string): Promise<number>;
}

export const AUTH_SESSION_REPOSITORY = Symbol('AUTH_SESSION_REPOSITORY');

/**
 * 🧱 Tokens cross the network. Session state stays behind this boundary.
 */
