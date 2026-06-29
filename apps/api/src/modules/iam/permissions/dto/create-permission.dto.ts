/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/permissions/dto/create-permission.dto.ts
 * Purpose: DTO for creating permissions.
 * Phase: 2.5 — Roles & Permission Management
 */

import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @MaxLength(96)
  @Matches(/^[a-z0-9._:-]+$/)
  key!: string;

  @IsString()
  @MaxLength(96)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
