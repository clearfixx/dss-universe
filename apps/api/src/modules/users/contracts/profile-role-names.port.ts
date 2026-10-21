/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/contracts/profile-role-names.port.ts
 *
 * 🎯 Purpose:
 * Requests display-only role names without reading IAM assignments.
 *
 * 🧠 Responsibilities:
 * • retains exact role names and missing-subject empty arrays;
 * • grants no permissions and performs no eligibility decision.
 *
 * 🏗️ Architecture:
 * Consumer-owned port; a root adapter binds the separately published IAM display reader.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const PROFILE_ROLE_NAMES_READER = Symbol('PROFILE_ROLE_NAMES_READER');
export interface ProfileRoleNamesReader {
  readNames(
    subjectIds: readonly string[],
  ): Promise<ReadonlyMap<string, readonly string[]>>;
}
