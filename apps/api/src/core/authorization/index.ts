/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: Authorization
 * 📄 File: apps/api/src/core/authorization/index.ts
 *
 * 🎯 Purpose:
 * Public API for Authorization Core.
 *
 * 🧠 Responsibilities:
 * • exports authorization module;
 * • exports permission decorators;
 * • exports permission registry;
 * • exports authorization guards, services, repositories, and types.
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
export {
  AUTHORIZATION_ROLE_PERMISSION_FACTS,
  AUTHORIZATION_SUBJECT_ASSIGNMENT_FACTS,
  type AuthorizationRolePermissionFacts,
  type AuthorizationSubjectAssignmentFacts,
} from './contracts/permission-facts-reader.port';

export { PermissionsService } from './services/permissions.service';

export type { UserAccessProfile } from './types/user-access-profile.type';
export {
  ACCESS_MEMBERSHIPS_READER,
  SUBJECT_ELIGIBILITY_READER,
  type AccessMembershipsReader,
  type SubjectEligibilityReader,
} from './contracts/access-memberships-reader.contract';
export {
  ACCESS_CAPABILITY_DECISIONS,
  type AccessCapabilityDecisions,
} from './contracts/access-capability-decisions.contract';
export {
  SUBJECT_ACCESS_READER,
  type SubjectAccessReader,
} from './contracts/subject-access-reader.interface';
