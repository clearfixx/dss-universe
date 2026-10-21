/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Safety
 * 📄 File: index.ts
 *
 * 🎯 Purpose:
 * Public API for IAM safety utilities.
 *
 * 🧠 Responsibilities:
 * • exports IamSafetyService;
 * • exports safety-related IAM types;
 * • keeps safety rules reusable inside IAM.
 *
 * 🏗️ Architecture:
 * Explicit public API boundary for IAM safety.
 *
 * ⚠️ Important:
 * Safety rules protect system roles from dangerous changes.
 *
 * 💡 Notes:
 * If this layer blocks you,
 * it probably saved future-you from debugging at 3 AM. ☕
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { IamSafetyService } from './iam-safety.service';

export type { ProtectedRole } from './types/protected-role.type';
