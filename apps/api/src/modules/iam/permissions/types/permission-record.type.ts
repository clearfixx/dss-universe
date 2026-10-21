/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Permissions
 * 📄 File: apps/api/src/modules/iam/permissions/types/permission-record.type.ts
 *
 * 🎯 Purpose:
 * Defines the permission view owned by IAM independently of persistence models.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type PermissionRecord = Readonly<{
  id: string;
  key: string;
  label: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;
