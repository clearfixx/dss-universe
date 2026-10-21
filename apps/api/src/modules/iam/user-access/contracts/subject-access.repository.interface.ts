/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/user-access/contracts/subject-access.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines private assignment reads and ordinary writes without ORM dependencies.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { SubjectAccessAssignments } from '../types/subject-access-assignments.type';

export interface SubjectAccessRepository {
  findAssignments(subjectId: string): Promise<SubjectAccessAssignments | null>;
  subjectExists(subjectId: string): Promise<boolean>;
  roleExists(roleId: string): Promise<boolean>;
  permissionExists(permissionId: string): Promise<boolean>;
  hasRole(subjectId: string, roleId: string): Promise<boolean>;
  grantRole(subjectId: string, roleId: string): Promise<void>;
  hasDirectPermission(
    subjectId: string,
    permissionId: string,
  ): Promise<boolean>;
  grantPermission(subjectId: string, permissionId: string): Promise<void>;
  revokePermission(subjectId: string, permissionId: string): Promise<void>;
}
export const IAM_SUBJECT_ACCESS_REPOSITORY = Symbol(
  'IAM_SUBJECT_ACCESS_REPOSITORY',
);
