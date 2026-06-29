/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/user-access/dto/grant-user-role.dto.ts
 * Purpose: DTO for granting a role to a user.
 * Phase: 2.5 — Roles & Permission Management
 */

import { IsUUID } from 'class-validator';

export class GrantUserRoleDto {
  @IsUUID('4')
  roleId!: string;
}
