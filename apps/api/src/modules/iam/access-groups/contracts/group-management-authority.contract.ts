/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/contracts/group-management-authority.contract.ts
 *
 * 🎯 Purpose:
 * Requires current management authority without importing foreign business services.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface GroupManagementAuthority {
  canManage(subjectId: string): Promise<boolean>;
}
export const GROUP_MANAGEMENT_AUTHORITY = Symbol('GROUP_MANAGEMENT_AUTHORITY');
