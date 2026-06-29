/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/permissions/dto/assign-permission.dto.ts
 * Purpose: DTO for assigning a permission to a role.
 * Phase: 2.5 — Roles & Permission Management
 */

import { IsString } from 'class-validator';

export class AssignPermissionDto {
  @IsString()
  roleId!: string;
}
