/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: authorization-request.type.ts
 *
 * 🎯 Purpose:
 * Типізований HTTP Request для Authorization Guard.
 *
 * 🧠 Why?
 * Express Request не знає про request.user.
 * Ми додаємо його самі через JwtStrategy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { Request } from 'express';

type AuthorizationUser = {
  role?: string;
  roles?: string[];
};

export interface AuthorizationRequest extends Request {
  user?: AuthorizationUser;
}
