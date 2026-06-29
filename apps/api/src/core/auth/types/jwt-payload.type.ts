/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🔐 Module: Authentication
 * 📄 File: jwt-payload.type.ts
 *
 * 🎯 Purpose:
 * Defines the JWT payload contract used by DSS API access tokens.
 *
 * 🧠 Responsibilities:
 * • describes authenticated identity stored in access tokens;
 * • carries database-driven roles;
 * • carries effective permissions for backend authorization.
 *
 * 🏗️ Architecture:
 * TokenService
 *   ↓
 * JWT Access Token
 *   ↓
 * JwtStrategy
 *   ↓
 * AuthenticatedUser
 *
 * ⚠️ Important:
 * This contract must stay aligned with AuthenticatedUser.
 *
 * 💡 Notes:
 * If this payload changes, every issued token becomes part of the story. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type JwtPayload = {
  sub: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
};
