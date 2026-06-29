/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: authenticated-request.type.ts
 *
 * 🎯 Purpose:
 * Типізує HTTP Request після проходження JWT authentication.
 *
 * 🧠 Why?
 * Express Request сам по собі не знає про request.user.
 * Але JwtStrategy додає user у request, тому ми описуємо це явно.
 *
 * 🏗️ Architecture:
 * JwtStrategy
 *   ↓
 * request.user
 *   ↓
 * Guards / Controllers / Interceptors
 *
 * ⚠️ Important:
 * Цей тип належить Auth Core, бо саме Auth створює identity.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/auth/types/authenticated-request.type.ts
 * Purpose: Express request type with authenticated DSS user.
 * Phase: 2.4.5 — RBAC Core Migration
 * Architecture: Auth request contract
 */

import type { Request } from 'express';

import type { AuthenticatedUser } from './authenticated-user.type';

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export type AuthenticatedRequestUser = AuthenticatedUser;
