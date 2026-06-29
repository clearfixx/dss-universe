/**
 * DSS File Passport 🛰️
 * File: apps/api/src/core/auth/index.ts
 * Purpose: Public API for Auth Core.
 * Phase: 2.5.9 — Architecture Cleanup
 * Architecture: Explicit exports
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
