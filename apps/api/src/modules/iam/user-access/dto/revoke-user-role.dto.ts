/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/user-access/dto/revoke-user-role.dto.ts
 * Purpose: DTO for revoking a role from a user.
 * Phase: 2.5 — Roles & Permission Management
 */

import { IsUUID } from 'class-validator';

export class RevokeUserRoleDto {
  @IsUUID('4')
  roleId!: string;
}
