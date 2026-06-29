/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/safety/index.ts
 * Purpose: Public API for IAM safety rules.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: Safety boundary for destructive IAM operations
 */

export { IamSafetyService } from './iam-safety.service';

export type { ProtectedRole } from './types/protected-role.type';
