/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/user-access/dto/grant-user-permission.dto.ts
 * Purpose: DTO for granting a direct permission to a user.
 * Phase: 2.5 — Roles & Permission Management
 */

import { IsUUID } from 'class-validator';

export class GrantUserPermissionDto {
  @IsUUID('4')
  permissionId!: string;
}
