/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/contracts/subject-existence-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes authoritative opaque subject existence for every persisted account state.
 *
 * ⚠️ Important:
 * Existence is not authentication; preserve all-state ID-only semantics.
 * Independent reads do not introduce a snapshot or permission decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const AUTH_SUBJECT_EXISTENCE_READER = Symbol(
  'AUTH_SUBJECT_EXISTENCE_READER',
);
export interface AuthSubjectExistenceReader {
  exists(subjectId: string): Promise<boolean>;
}
