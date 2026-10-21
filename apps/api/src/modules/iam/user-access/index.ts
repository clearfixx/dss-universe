/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM User Access
 * 📄 File: index.ts
 *
 * 🎯 Purpose:
 * Public API for the IAM user access feature slice.
 *
 * 🧠 Responsibilities:
 * • exports UserAccessController;
 * • exports UserAccessService;
 * • exports user-access DTOs and types;
 * • keeps user-access feature imports explicit.
 *
 * 🏗️ Architecture:
 * Feature-slice public API boundary.
 *
 * ⚠️ Important:
 * User access combines roles and direct permissions.
 *
 * 💡 Notes:
 * This is the airlock manifest.
 * No random passengers. 🧑‍🚀
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { UserAccessController } from './user-access.controller';
export { UserAccessService } from './user-access.service';

export { GrantUserPermissionDto } from './dto/grant-user-permission.dto';
export { GrantUserRoleDto } from './dto/grant-user-role.dto';
export { RevokeUserPermissionDto } from './dto/revoke-user-permission.dto';
export { RevokeUserRoleDto } from './dto/revoke-user-role.dto';

export type { UserAccessSummary } from './types/user-access-summary.type';
