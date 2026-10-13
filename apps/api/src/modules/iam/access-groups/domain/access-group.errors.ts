/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/domain/access-group.errors.ts
 *
 * 🎯 Purpose:
 * Names key conflicts without leaking ORM representation into application code.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export class AccessGroupKeyConflict extends Error {
  constructor() {
    super('Access group key already exists.');
    this.name = 'AccessGroupKeyConflict';
  }
}
