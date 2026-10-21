/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/repositories/access-session.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines the persistence boundary for current access-session eligibility.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { AccessSessionState } from '../types/access-session-state.type';

export interface AccessSessionRepository {
  findById(sessionId: string): Promise<AccessSessionState | null>;
}

export const ACCESS_SESSION_REPOSITORY = Symbol('ACCESS_SESSION_REPOSITORY');
