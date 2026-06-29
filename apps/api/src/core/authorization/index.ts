/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: index.ts
 *
 * 🎯 Purpose:
 * Public API for the Authorization Core.
 *
 * 🧠 Responsibilities:
 * • exports authorization decorators;
 * • exports permission registry;
 * • exports authorization guards;
 * • exposes authorization services and repositories.
 *
 * 🏗️ Architecture:
 * Explicit public API boundary for @api/core/authorization.
 *
 * ⚠️ Important:
 * Do not export internal implementation details unless another module truly needs them.
 *
 * 💡 Notes:
 * Public exports are promises. Make them carefully. 🛰️
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
