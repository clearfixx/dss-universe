/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: Authorization
 * 📄 File: apps/api/src/core/authorization/types/user-access-profile.type.ts
 *
 * 🎯 Purpose:
 * Defines the effective authorization profile used by access-token generation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type UserAccessProfile = {
  roles: string[];
  permissions: string[];
};
