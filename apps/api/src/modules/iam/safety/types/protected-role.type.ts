/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/safety/types/protected-role.type.ts
 * Purpose: Describes roles that require additional safety checks.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: IAM safety typing
 */

export type ProtectedRole = {
  name: string;
  reason: string;
};
