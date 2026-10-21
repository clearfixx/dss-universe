/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM User Access
 * 📄 File: grant-user-role.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for granting a role to a user.
 *
 * 🧠 Responsibilities:
 * • validates roleId;
 * • keeps user-role assignment input explicit;
 * • protects role grant payload shape.
 *
 * 🏗️ Architecture:
 * IAM user-access DTO.
 *
 * ⚠️ Important:
 * Granting roles changes effective permissions.
 *
 * 💡 Notes:
 * Assigning a role is not just giving a title.
 * It changes what doors open. 🔑
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { IsUUID } from 'class-validator';

export class GrantUserRoleDto {
  @IsUUID('4')
  roleId!: string;
}
