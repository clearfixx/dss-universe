/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/roles/dto/assign-role.dto.ts
 * Purpose: DTO for assigning permissions to a role.
 * Phase: 2.5 — Roles & Permission Management
 */

import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @IsUUID('4')
  permissionId!: string;
}
