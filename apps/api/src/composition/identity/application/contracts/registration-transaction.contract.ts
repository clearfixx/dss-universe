/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/application/contracts/registration-transaction.contract.ts
 *
 * 🎯 Purpose:
 * Binds profile input to an atomic credential-subject write without exposing SQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { CredentialSubjectStore } from '@api/modules/auth';

export interface RegistrationTransaction {
  forProfile(
    profile: Readonly<{ username: string; displayName?: string }>,
  ): CredentialSubjectStore;
}
export const REGISTRATION_TRANSACTION = Symbol('REGISTRATION_TRANSACTION');
