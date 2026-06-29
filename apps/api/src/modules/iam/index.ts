/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/index.ts
 * Purpose: Public API for the IAM module.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: Explicit module exports
 */

export { IamModule } from './iam.module';

export * from './permissions';
export * from './roles';
export * from './safety';
export * from './user-access';
