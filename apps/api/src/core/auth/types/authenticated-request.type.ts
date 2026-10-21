/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: authenticated-request.type.ts
 *
 * 🎯 Purpose:
 * Types HTTP requests after successful JWT authentication.
 *
 * 🧠 Responsibilities:
 * • extends Express Request with DSS authenticated user;
 * • provides a shared request contract for guards, decorators, and controllers;
 * • keeps request.user typing centralized in Auth Core.
 *
 * 🏗️ Architecture:
 * JwtStrategy
 *   ↓
 * request.user
 *   ↓
 * Guards / Controllers / Interceptors
 *
 * ⚠️ Important:
 * Auth Core owns identity shape.
 * Authorization may read permissions from it, but must not redefine it.
 *
 * 💡 Notes:
 * If request.user is missing after JwtAuthGuard,
 * something has gone very wrong near the airlock. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { Request } from 'express';

import type { AuthenticatedUser } from './authenticated-user.type';

export type AuthenticatedRequest = Omit<Request, 'user'> & {
  user?: AuthenticatedUser;
};

export type AuthenticatedRequestUser = AuthenticatedUser;
