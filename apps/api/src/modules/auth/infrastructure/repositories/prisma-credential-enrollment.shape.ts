/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-credential-enrollment.shape.ts
 *
 * 🎯 Purpose:
 * Selects only Auth-owned credential fields for atomic enrollment composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { CredentialSubjectStore } from '../../contracts/credential-subject-store.contract';

export function credentialEnrollmentData(
  credentials: Parameters<CredentialSubjectStore['create']>[0],
) {
  return { email: credentials.email, passwordHash: credentials.passwordHash };
}
