/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM User Access
 * 📄 File: revoke-user-role.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for revoking a role from a user.
 *
 * 🧠 Responsibilities:
 * • validates roleId;
 * • keeps user-role revocation input explicit;
 * • protects role revoke payload shape.
 *
 * 🏗️ Architecture:
 * IAM user-access DTO.
 *
 * ⚠️ Important:
 * Revoking roles changes effective permissions.
 *
 * 💡 Notes:
 * Sometimes closing a door is the safest feature. 🚪
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { IsUUID } from 'class-validator';

export class RevokeUserRoleDto {
  @IsUUID('4')
  roleId!: string;
}
