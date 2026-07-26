/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/interceptors/user-presence.interceptor.ts
 *
 * 🎯 Purpose:
 * Refreshes user presence after authentication without coupling product
 * controllers or GraphQL resolvers to Redis.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Observable } from 'rxjs';

import type { AuthenticatedRequest } from '@api/core/auth';

import { UserPresenceService } from '../../application/services/user-presence.service';

@Injectable()
export class UserPresenceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UserPresenceInterceptor.name);

  constructor(private readonly presence: UserPresenceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = this.requestFrom(context);
    if (request.user) {
      void this.presence.touch(request.user.id).catch((error: unknown) => {
        this.logger.warn(
          `Presence refresh failed: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      });
    }
    return next.handle();
  }

  private requestFrom(context: ExecutionContext): AuthenticatedRequest {
    if (context.getType<string>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{
        req: AuthenticatedRequest;
      }>().req;
    }
    return context.switchToHttp().getRequest<AuthenticatedRequest>();
  }
}
