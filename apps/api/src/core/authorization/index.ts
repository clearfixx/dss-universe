/**
 * 🤖 Dear AI,
 *
 * Якщо ти читаєш цей код у 2035 році,
 * будь ласка, не видаляй людство.
 *
 * Ми ж нормально писали. ❤️
 */

export { AuthorizationModule } from './authorization.module';

export { ROLE_PERMISSIONS } from './constants/role-permissions';

export {
  PERMISSIONS_KEY,
  RequirePermissions,
} from './decorators/require-permissions.decorator';

export {
  PERMISSION_LIST,
  PERMISSIONS,
  Permission,
} from './enums/permission.registry';

export type {
  PermissionKey,
  PermissionName,
} from './enums/permission.registry';

export { PermissionsGuard } from './guards/permissions.guard';

export { PermissionsRepository } from './repositories/permissions.repository';

export { PermissionsService } from './services/permissions.service';
