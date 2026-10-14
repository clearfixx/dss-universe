/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/domain/ports/gate-account-evidence.interface.ts
 *
 * 🎯 Purpose:
 * Defines minimal account availability and age evidence for gate evaluation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const GATE_ACCOUNT_EVIDENCE = Symbol('GATE_ACCOUNT_EVIDENCE');
export type GateAccountEvidence = Readonly<{
  active: boolean;
  createdAt: Date;
}>;
export interface GateAccountEvidenceReader {
  find(subjectId: string): Promise<GateAccountEvidence | null>;
}
