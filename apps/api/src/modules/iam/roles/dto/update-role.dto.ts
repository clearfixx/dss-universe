/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Roles
 * 📄 File: update-role.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for updating a role.
 *
 * 🧠 Responsibilities:
 * • validates optional role name changes;
 * • validates label updates;
 * • validates description updates.
 *
 * 🏗️ Architecture:
 * IAM role DTO.
 *
 * ⚠️ Important:
 * System role changes are additionally protected by IamSafetyService.
 *
 * 💡 Notes:
 * Optional fields are allowed here.
 * Optional architecture is not. 😄
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
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
