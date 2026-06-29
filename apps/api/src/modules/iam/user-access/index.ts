/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/user-access/index.ts
 * Purpose: Public API for direct user access management.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: Explicit folder exports
 */

export { UserAccessController } from './user-access.controller';
export { UserAccessService } from './user-access.service';

export { GrantUserPermissionDto } from './dto/grant-user-permission.dto';
export { GrantUserRoleDto } from './dto/grant-user-role.dto';
export { RevokeUserPermissionDto } from './dto/revoke-user-permission.dto';
export { RevokeUserRoleDto } from './dto/revoke-user-role.dto';

export type { UserAccessSummary } from './types/user-access-summary.type';
