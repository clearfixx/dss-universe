/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/user-access/types/user-access-summary.type.ts
 * Purpose: Summary of roles and permissions assigned to a user.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: IAM user access typing
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
