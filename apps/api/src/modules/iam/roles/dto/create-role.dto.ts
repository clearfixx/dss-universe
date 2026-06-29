/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/iam/roles/dto/create-role.dto.ts
 * Purpose: DTO for creating IAM roles.
 * Phase: 2.5 — Roles & Permission Management
 */

import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9._-]+$/)
  name!: string;

  @IsString()
  @MaxLength(96)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds?: string[];
}
