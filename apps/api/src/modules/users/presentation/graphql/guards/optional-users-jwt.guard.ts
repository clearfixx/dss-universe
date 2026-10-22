/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: D5 Presentation Boundaries
 * 📄 File: apps/api/src/modules/users/presentation/graphql/guards/optional-users-jwt.guard.ts
 * 🎯 Purpose: Preserves optional Users JWT extraction and guest fallback.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '@api/core/auth';

@Injectable()
export class OptionalUsersJwtGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    return GqlExecutionContext.create(context).getContext<{
      req: { user?: AuthenticatedUser };
    }>().req;
  }

  handleRequest<TUser>(error: unknown, user: TUser): TUser | undefined {
    return error ? undefined : user;
  }
}
