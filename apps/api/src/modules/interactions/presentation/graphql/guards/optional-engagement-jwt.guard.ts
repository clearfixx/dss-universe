/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/presentation/graphql/guards/optional-engagement-jwt.guard.ts
 * 🎯 Purpose: Preserves optional JWT extraction and guest fallback for engagement transport.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { type ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '@api/core/auth';

@Injectable()
export class OptionalEngagementJwtGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    return GqlExecutionContext.create(context).getContext<{
      req: { user?: AuthenticatedUser };
    }>().req;
  }

  handleRequest<TUser>(error: unknown, user: TUser): TUser | undefined {
    return error ? undefined : user;
  }
}
