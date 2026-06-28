export { AuthCoreModule } from './auth-core.module';

export { AuthUser } from './decorators/auth-user.decorator';
export { Authenticated } from './decorators/authenticated.decorator';

export { JwtAuthGuard } from './guards/jwt-auth.guard';

export { JwtStrategy } from './strategies/jwt.strategy';

export type { AuthenticatedUser } from './types/authenticated-user.type';
export type { JwtPayload } from './types/jwt-payload.type';
export type {
  AuthenticatedRequest,
  AuthenticatedRequestUser,
} from './types/authenticated-request.type';
