/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Permissions
 * 📄 File: create-permission.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for creating a permission.
 *
 * 🧠 Responsibilities:
 * • validates permission key;
 * • validates permission label;
 * • validates optional permission description.
 *
 * 🏗️ Architecture:
 * IAM permission DTO.
 *
 * ⚠️ Important:
 * Permission keys should use stable dot notation.
 *
 * 💡 Notes:
 * DTO is a contract.
 * If it changes, the API changed too. 📝
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
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
