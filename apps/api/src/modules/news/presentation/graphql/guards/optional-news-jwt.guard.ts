/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/guards/optional-news-jwt.guard.ts
 * 🎯 Purpose: Preserves optional JWT viewer extraction and guest fallback.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '@api/core/auth';

@Injectable()
export class OptionalNewsJwtGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    return GqlExecutionContext.create(context).getContext<{
      req: { user?: AuthenticatedUser };
    }>().req;
  }

  handleRequest<TUser>(error: unknown, user: TUser): TUser | undefined {
    return error ? undefined : user;
  }
}
