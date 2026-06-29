/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Safety
 * 📄 File: protected-role.type.ts
 *
 * 🎯 Purpose:
 * Defines protected IAM role identifiers.
 *
 * 🧠 Responsibilities:
 * • describes role names that require extra safety checks;
 * • keeps protected-role typing centralized;
 * • supports IAM safety rules.
 *
 * 🏗️ Architecture:
 * IAM safety type contract.
 *
 * ⚠️ Important:
 * Protected roles are platform-critical.
 *
 * 💡 Notes:
 * Some roles are just roles.
 * Some roles are load-bearing walls. 🧱
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type ProtectedRole = {
  name: string;
  reason: string;
};
