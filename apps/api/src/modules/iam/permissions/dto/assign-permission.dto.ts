/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Permissions
 * 📄 File: assign-permission.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for assigning a permission.
 *
 * 🧠 Responsibilities:
 * • validates permissionId;
 * • keeps permission assignment payloads explicit;
 * • prevents ambiguous assignment input.
 *
 * 🏗️ Architecture:
 * IAM permission DTO.
 *
 * ⚠️ Important:
 * This DTO is generic assignment input.
 * Check the receiving service for assignment direction.
 *
 * 💡 Notes:
 * One UUID can open a lot of doors. 🔐
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { IsString } from 'class-validator';

export class AssignPermissionDto {
  @IsString()
  roleId!: string;
}
