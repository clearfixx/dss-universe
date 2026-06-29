/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: Authorization
 * 📄 File: index.ts
 *
 * 🎯 Purpose:
 * Public API for Authorization Core.
 *
 * 🧠 Responsibilities:
 * • exports authorization module;
 * • exports permission decorators;
 * • exports permission registry;
 * • exports authorization guards, services, and repositories.
 *
 * 🏗️ Architecture:
 * Explicit public API boundary for @api/core/authorization.
 *
 * ⚠️ Important:
 * Public exports are contracts.
 * Do not expose internals without a reason.
 *
 * 💡 Notes:
 * If another module imports from here,
 * this file becomes part of its architecture map. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { AuthorizationModule } from './authorization.module';

export {
  PERMISSIONS_KEY,
  RequirePermissions,
} from './decorators/require-permissions.decorator';

export type {
  PermissionKey,
  PermissionName,
} from './enums/permission.registry';

export {
  PERMISSION_LIST,
  PERMISSIONS,
  Permission,
} from './enums/permission.registry';

export { PermissionsGuard } from './guards/permissions.guard';

export { PermissionsRepository } from './repositories/permissions.repository';

export { PermissionsService } from './services/permissions.service';
