/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🔐 Module: Authentication
 * 📄 File: apps/api/src/core/auth/types/authenticated-user.type.ts
 *
 * 🎯 Purpose:
 * Defines the authenticated user shape attached to request.user.
 *
 * 🧠 Responsibilities:
 * • represents identity after JWT validation;
 * • exposes roles from the authoritative access read for this request;
 * • exposes current effective permissions for guards and services.
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
 * Access arrays are refreshed for every authenticated request, not copied from JWT.
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
  sessionId: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
};
