/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM User Access
 * 📄 File: user-access-summary.type.ts
 *
 * 🎯 Purpose:
 * Defines the user access summary response shape.
 *
 * 🧠 Responsibilities:
 * • describes assigned user roles;
 * • describes direct user permissions;
 * • describes effective permissions.
 *
 * 🏗️ Architecture:
 * IAM user-access response contract.
 *
 * ⚠️ Important:
 * This type represents API output, not Prisma internals.
 *
 * 💡 Notes:
 * Effective permissions are what the backend actually cares about. 🛡️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type UserAccessSummary = {
  userId: string;
  roles: Array<{
    id: string;
    name: string;
  }>;
  directPermissions: Array<{
    id: string;
    name: string;
  }>;
  effectivePermissions: string[];
};
