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
