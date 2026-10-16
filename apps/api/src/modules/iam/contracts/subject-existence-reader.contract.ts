/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/contracts/subject-existence-reader.contract.ts
 *
 * 🎯 Purpose:
 * Defines IAM's ID-only existence input without account eligibility or profile facts.
 *
 * ⚠️ Important:
 * Existence is not authentication; preserve all-state ID-only semantics.
 * Independent reads do not introduce a snapshot or permission decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const IAM_SUBJECT_EXISTENCE_READER = Symbol(
  'IAM_SUBJECT_EXISTENCE_READER',
);
export interface IamSubjectExistenceReader {
  exists(subjectId: string): Promise<boolean>;
}
