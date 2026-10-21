/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM User Access
 * 📄 File: grant-user-permission.dto.ts
 *
 * 🎯 Purpose:
 * Defines the request contract for granting a direct permission to a user.
 *
 * 🧠 Responsibilities:
 * • validates permissionId;
 * • keeps direct permission assignment input explicit;
 * • protects user-permission grant payload shape.
 *
 * 🏗️ Architecture:
 * IAM user-access DTO.
 *
 * ⚠️ Important:
 * Direct permissions bypass role grouping.
 * Use them intentionally.
 *
 * 💡 Notes:
 * Direct permissions are precision tools.
 * Not everyday hammers. 🔧
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { IsUUID } from 'class-validator';

export class GrantUserPermissionDto {
  @IsUUID('4')
  permissionId!: string;
}
