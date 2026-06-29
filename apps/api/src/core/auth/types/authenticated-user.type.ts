/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/auth/types/authenticated-user.type.ts
 * Purpose: Authenticated user shape attached to request.user.
 * Phase: 2.4.5 — RBAC Core Migration
 * Architecture: Auth core contract
 *
 * Notes:
 * - Roles are now database-driven.
 * - One user may have many hats. Some hats are dangerous. 🎩
 */

export type AuthenticatedUser = {
  id: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
};
