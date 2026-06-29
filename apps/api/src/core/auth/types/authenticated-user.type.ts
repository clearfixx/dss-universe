/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🔐 Module: Authentication
 * 📄 File: authenticated-user.type.ts
 *
 * 🎯 Purpose:
 * Defines the authenticated user shape attached to request.user.
 *
 * 🧠 Responsibilities:
 * • represents identity after JWT validation;
 * • exposes database-driven roles;
 * • exposes effective permissions for authorization guards.
 *
 * 🏗️ Architecture:
 * JwtStrategy
 *   ↓
 * request.user
 *   ↓
 * Guards / Controllers / Decorators
 *
 * ⚠️ Important:
 * Authorization reads permissions from this contract.
 * Keep it aligned with JwtPayload.
 *
 * 💡 Notes:
 * One user may have many hats.
 * Some hats open dangerous doors. 🎩
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type AuthenticatedUser = {
  id: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
};
