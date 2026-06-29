/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/permissions/index.ts
 * Purpose: Public API for IAM permissions.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: Explicit folder exports
 */

export { PermissionsController } from './permissions.controller';
export { PermissionsService } from './permissions.service';

export { AssignPermissionDto } from './dto/assign-permission.dto';
export { CreatePermissionDto } from './dto/create-permission.dto';
export { UpdatePermissionDto } from './dto/update-permission.dto';

export type { PermissionKey } from './types/permission-key.type';
