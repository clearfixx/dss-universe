/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/contracts/role-permission-keys-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes IAM-owned permission keys for named roles without decisions or account data.
 *
 * 🏗️ Architecture:
 * Owned fact boundary; root infrastructure assembles cross-owner persistence.
 *
 * ⚠️ Important:
 * Preserve current query schedule and first-seen order; no ACTIVE policy, cache or fallback on failure.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const IAM_ROLE_PERMISSION_KEYS_READER = Symbol(
  'IAM_ROLE_PERMISSION_KEYS_READER',
);
export interface IamRolePermissionKeysReader {
  read(roleNames: string[]): Promise<string[]>;
}
