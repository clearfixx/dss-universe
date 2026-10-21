/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Roles
 * 📄 File: assign-role.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for assigning a permission to a role.
 *
 * 🧠 Responsibilities:
 * • validates permissionId;
 * • protects role-permission assignment input;
 * • keeps assignment payloads explicit.
 *
 * 🏗️ Architecture:
 * IAM role DTO.
 *
 * ⚠️ Important:
 * This DTO assigns permissions to roles, not roles to users.
 *
 * 💡 Notes:
 * Tiny DTO.
 * Big access consequences. 🔑
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @IsUUID('4')
  permissionId!: string;
}
