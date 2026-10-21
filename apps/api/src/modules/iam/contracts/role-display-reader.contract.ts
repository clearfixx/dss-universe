/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/contracts/role-display-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes current role names for display without assignment mutation or effective permission decisions.
 *
 * 🧠 Responsibilities:
 * • retains assignment ordering and empty arrays for requested missing IDs;
 * • exposes no profile, credentials or role configuration.
 *
 * 🏗️ Architecture:
 * Narrow published display contract; root composition adapts it to the consumer-owned port.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const IAM_ROLE_DISPLAY_READER = Symbol('IAM_ROLE_DISPLAY_READER');
export interface IamRoleDisplayReader {
  readNames(
    subjectIds: readonly string[],
  ): Promise<ReadonlyMap<string, readonly string[]>>;
}
