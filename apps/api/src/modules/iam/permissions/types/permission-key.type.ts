/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Permissions
 * 📄 File: permission-key.type.ts
 *
 * 🎯 Purpose:
 * Defines the permission key type used inside IAM permissions.
 *
 * 🧠 Responsibilities:
 * • provides a named alias for permission identifiers;
 * • keeps permission-related contracts readable;
 * • supports future narrowing of permission keys.
 *
 * 🏗️ Architecture:
 * IAM permission type contract.
 *
 * ⚠️ Important:
 * Today this is a string alias.
 * Tomorrow it may become stricter.
 *
 * 💡 Notes:
 * Small type aliases are future docking ports. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type PermissionKey = string;
