/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/permissions/dto/update-permission.dto.ts
 * Purpose: DTO for updating permissions.
 * Phase: 2.5 — Roles & Permission Management
 */

import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdatePermissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(96)
  @Matches(/^[a-z0-9._:-]+$/)
  key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(96)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
