/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🔐 Module: Authentication
 * 📄 File: index.ts
 *
 * 🎯 Purpose:
 * Public API for Auth Core.
 *
 * 🧠 Responsibilities:
 * • exports auth module;
 * • exports auth decorators and guards;
 * • exports auth strategy;
 * • exposes shared authentication contracts.
 *
 * 🏗️ Architecture:
 * Explicit public API boundary for @api/core/auth.
 *
 * ⚠️ Important:
 * Do not export internal implementation details unless another module truly needs them.
 *
 * 💡 Notes:
 * Public exports are promises.
 * Break them carefully. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { AuthCoreModule } from './auth-core.module';

export { AuthUser } from './decorators/auth-user.decorator';
export { Authenticated } from './decorators/authenticated.decorator';
export { Roles } from './decorators/roles.decorator';

export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';

export { JwtStrategy } from './strategies/jwt.strategy';

export type { AuthenticatedUser } from './types/authenticated-user.type';
export type { JwtPayload } from './types/jwt-payload.type';
export type {
  AuthenticatedRequest,
  AuthenticatedRequestUser,
} from './types/authenticated-request.type';
