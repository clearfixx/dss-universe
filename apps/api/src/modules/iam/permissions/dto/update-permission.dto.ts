/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Permissions
 * 📄 File: update-permission.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for updating a permission.
 *
 * 🧠 Responsibilities:
 * • validates optional permission key changes;
 * • validates label updates;
 * • validates description updates.
 *
 * 🏗️ Architecture:
 * IAM permission DTO.
 *
 * ⚠️ Important:
 * Permission key changes may affect existing tokens and protected routes.
 *
 * 💡 Notes:
 * Optional fields are fine.
 * Optional security thinking is not. 😄
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
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
