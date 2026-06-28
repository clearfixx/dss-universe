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

import type { Request } from 'express';

export type AuthenticatedRequestUser = {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
  roles?: string[];
};

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedRequestUser;
}
