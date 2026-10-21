/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/contracts/account-evidence.contract.ts
 *
 * 🎯 Purpose:
 * Publishes account eligibility and creation time without profile or credential fields.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type AuthAccountEvidence = Readonly<{
  active: boolean;
  createdAt: Date;
}>;
export interface AuthAccountEvidenceReader {
  find(subjectId: string): Promise<AuthAccountEvidence | null>;
}
export const AUTH_ACCOUNT_EVIDENCE = Symbol('AUTH_ACCOUNT_EVIDENCE');
