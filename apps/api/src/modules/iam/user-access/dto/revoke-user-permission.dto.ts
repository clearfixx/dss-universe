/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/user-access/dto/revoke-user-permission.dto.ts
 * Purpose: DTO for revoking a direct permission from a user.
 * Phase: 2.5 — Roles & Permission Management
 */

import { IsUUID } from 'class-validator';

export class RevokeUserPermissionDto {
  @IsUUID('4')
  permissionId!: string;
}
