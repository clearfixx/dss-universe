/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/roles/dto/update-role.dto.ts
 * Purpose: DTO for updating IAM roles.
 * Phase: 2.5 — Roles & Permission Management
 */

import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9._-]+$/)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(96)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
