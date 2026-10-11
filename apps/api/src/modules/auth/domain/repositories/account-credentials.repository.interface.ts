/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/domain/repositories/account-credentials.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines Auth-owned credential reads and account-state writes for opaque subjects.
 *
 * ⚠️ Important:
 * Commands include authoritative state guards, session invalidation and audit.
 * No profile, ORM record or transaction client crosses this contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { AccountCredentials } from '../types/account-credentials.type';

export interface AccountCredentialsRepository {
  findById(subjectId: string): Promise<AccountCredentials | null>;
  findByEmail(email: string): Promise<AccountCredentials | null>;
  deactivateAccount(subjectId: string): Promise<void>;
  reactivateAccount(subjectId: string): Promise<void>;
  changeEmail(subjectId: string, email: string): Promise<void>;
  changePasswordHash(subjectId: string, passwordHash: string): Promise<void>;
}

export const ACCOUNT_CREDENTIALS_REPOSITORY = Symbol(
  'ACCOUNT_CREDENTIALS_REPOSITORY',
);
