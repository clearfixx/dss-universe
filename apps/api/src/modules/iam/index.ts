/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM
 * 📄 File: index.ts
 *
 * 🎯 Purpose:
 * Public API for the IAM module.
 *
 * 🧠 Responsibilities:
 * • exports IamModule;
 * • exposes IAM feature slices through explicit module boundaries;
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

export * from './permissions';
export * from './roles';
export * from './safety';
export * from './user-access';
