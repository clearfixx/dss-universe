/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM User Access
 * 📄 File: revoke-user-permission.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for revoking a direct permission from a user.
 *
 * 🧠 Responsibilities:
 * • validates permissionId;
 * • keeps direct permission revocation input explicit;
 * • protects user-permission revoke payload shape.
 *
 * 🏗️ Architecture:
 * IAM user-access DTO.
 *
 * ⚠️ Important:
 * Removing direct permissions may immediately change access after token refresh.
 *
 * 💡 Notes:
 * Access removed quietly is still security improved. 🛡️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { IsUUID } from 'class-validator';

export class RevokeUserPermissionDto {
  @IsUUID('4')
  permissionId!: string;
}
