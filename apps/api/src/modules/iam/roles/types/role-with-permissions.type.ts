/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Roles
 * 📄 File: role-with-permissions.type.ts
 *
 * 🎯 Purpose:
 * Defines the role response shape with assigned permissions.
 *
 * 🧠 Responsibilities:
 * • describes role data returned by IAM role operations;
 * • includes assigned permission summaries;
 * • keeps role API responses typed.
 *
 * 🏗️ Architecture:
 * IAM role response contract.
 *
 * ⚠️ Important:
 * This type represents public API output, not Prisma internals.
 *
 * 💡 Notes:
 * Do not leak database shape by accident.
 * APIs remember everything clients learn. 📡
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type RoleWithPermissions = {
  id: string;
  name: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  permissions: Array<{
    id: string;
    key: string;
    label: string;
    description: string | null;
  }>;
};
