/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/roles/types/role-with-permissions.type.ts
 * Purpose: Shared role type with attached permissions.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: IAM role typing
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
