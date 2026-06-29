/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/auth/types/jwt-payload.type.ts
 * Purpose: JWT payload used by DSS API authentication.
 * Phase: 2.4.5 — RBAC Core Migration
 * Architecture: Auth token contract
 */

export type JwtPayload = {
  sub: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
};
