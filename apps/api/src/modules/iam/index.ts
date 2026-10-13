/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM
 * 📄 File: apps/api/src/modules/iam/index.ts
 *
 * 🎯 Purpose:
 * Public API for the IAM module.
 *
 * 🧠 Responsibilities:
 * • exports IamModule;
 * • exposes the registration role policy required by root composition;
 * • keeps external imports clean and predictable.
 *
 * 🏗️ Architecture:
 * Explicit public API boundary for @api/modules/iam.
 *
 * ⚠️ Important:
 * Export only what other modules are allowed to use.
 *
 * 💡 Notes:
 * Public exports are like station doors.
 * Do not open random airlocks. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { IamModule } from './iam.module';
export { REGISTRATION_ROLE_NAME } from './contracts/registration-role.policy';
export {
  IAM_ACCESS_MEMBERSHIPS,
  type IamAccessMembershipReader,
} from './access-groups/contracts/effective-memberships.contract';
export {
  GROUP_MANAGEMENT_AUTHORITY,
  type GroupManagementAuthority,
} from './access-groups/contracts/group-management-authority.contract';
export { IAM_PUBLIC_GROUP_DISPLAY } from './access-groups/contracts/public-group-display.contract';
export type {
  IamPublicGroupDisplayReader,
  PublicAccessGroup,
} from './access-groups/contracts/public-group-display.contract';
