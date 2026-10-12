/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/user-access/types/subject-access-assignments.type.ts
 *
 * 🎯 Purpose:
 * Defines private assignment facts without profile, credentials or ORM relations.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type SubjectAccessAssignments = {
  subjectId: string;
  roles: Array<{ id: string; name: string; permissionKeys: string[] }>;
  directPermissions: Array<{ id: string; key: string }>;
};
