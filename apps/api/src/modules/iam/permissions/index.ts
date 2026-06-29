/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Permissions
 * 📄 File: index.ts
 *
 * 🎯 Purpose:
 * Public API for the IAM permissions feature slice.
 *
 * 🧠 Responsibilities:
 * • exports PermissionsController;
 * • exports PermissionsService;
 * • exports permission DTOs and types;
 * • keeps permission feature imports explicit.
 *
 * 🏗️ Architecture:
 * Feature-slice public API boundary.
 *
 * ⚠️ Important:
 * Export only what other slices are allowed to depend on.
 *
 * 💡 Notes:
 * Permissions are tiny strings with serious authority. 🔑
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { PermissionsController } from './permissions.controller';
export { PermissionsService } from './permissions.service';

export { AssignPermissionDto } from './dto/assign-permission.dto';
export { CreatePermissionDto } from './dto/create-permission.dto';
export { UpdatePermissionDto } from './dto/update-permission.dto';

export type { PermissionKey } from './types/permission-key.type';
