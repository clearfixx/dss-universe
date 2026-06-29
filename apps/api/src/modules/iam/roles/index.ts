/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/roles/index.ts
 * Purpose: Public API for IAM roles.
 * Phase: 2.5 — Roles & Permission Management
 * Architecture: Explicit folder exports
 */

export { RolesController } from './roles.controller';
export { RolesService } from './roles.service';

export { AssignRoleDto } from './dto/assign-role.dto';
export { CreateRoleDto } from './dto/create-role.dto';
export { UpdateRoleDto } from './dto/update-role.dto';

export type { RoleWithPermissions } from './types/role-with-permissions.type';
