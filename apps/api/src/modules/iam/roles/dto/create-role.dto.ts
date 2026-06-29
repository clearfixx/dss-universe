/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Roles
 * 📄 File: create-role.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for creating a role.
 *
 * 🧠 Responsibilities:
 * • validates role name;
 * • validates role label and description;
 * • optionally accepts initial permission assignments.
 *
 * 🏗️ Architecture:
 * IAM role DTO.
 *
 * ⚠️ Important:
 * Role names are lowercase identifiers.
 *
 * 💡 Notes:
 * DTO is a contract.
 * If it changes, the API changed too. 📝
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
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
