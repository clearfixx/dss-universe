/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/contracts/assignment-reader.contract.ts
 *
 * 🎯 Purpose:
 * Defines nullable safe IAM assignment reads without persistence details.
 *
 * ⚠️ Important:
 * Existence is not authentication; preserve all-state ID-only semantics.
 * Independent reads do not introduce a snapshot or permission decision.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { SubjectAccessAssignments } from '../user-access/types/subject-access-assignments.type';
export const IAM_ASSIGNMENT_READER = Symbol('IAM_ASSIGNMENT_READER');
export interface IamAssignmentReader {
  find(subjectId: string): Promise<SubjectAccessAssignments | null>;
}
