/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core / Authentication
 * 📄 File: apps/api/src/core/auth/interceptors/read-only-enforcement.interceptor.ts
 *
 * 🎯 Purpose:
 * Rejects writes from authenticated subjects under an active write restriction.
 *
 * 🧠 Responsibilities:
 * • treats every GraphQL mutation and unsafe REST method as a write;
 * • lets operations marked @PermittedWhileReadOnly() through;
 * • leaves anonymous requests and reads untouched.
 *
 * ⚠️ Important:
 * Interceptors run after guards, so the authenticated user is already resolved.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { from, type Observable, switchMap } from 'rxjs';

import {
  WRITE_RESTRICTION_READER,
  type WriteRestrictionReader,
} from '../contracts/write-restriction-reader.interface';
import { PERMITTED_WHILE_READ_ONLY_KEY } from '../decorators/permitted-while-read-only.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class ReadOnlyEnforcementInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(WRITE_RESTRICTION_READER)
    private readonly restrictions: WriteRestrictionReader,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = this.writeRequest(context);
    const subjectId = request?.user?.id;
    if (!subjectId || this.permitted(context)) return next.handle();
    return from(this.restrictions.restrictedUntil(subjectId, new Date())).pipe(
      switchMap((until) => {
        if (until) {
          throw new ForbiddenException(
            `Your account is read-only until ${until.toISOString()}.`,
          );
        }
        return next.handle();
      }),
    );
  }

  private permitted(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(PERMITTED_WHILE_READ_ONLY_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true
    );
  }

  private writeRequest(context: ExecutionContext): AuthenticatedRequest | null {
    if (context.getType<string>() === 'graphql') {
      const gql = GqlExecutionContext.create(context);
      const info = gql.getInfo<{
        operation?: { operation?: string };
        parentType?: { name?: string };
      }>();
      // Only root mutation fields are writes; nested field resolvers only read.
      if (
        info?.operation?.operation !== 'mutation' ||
        info.parentType?.name !== 'Mutation'
      ) {
        return null;
      }
      return gql.getContext<{ req?: AuthenticatedRequest }>().req ?? null;
    }
    if (context.getType() !== 'http') return null;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return SAFE_METHODS.has(request.method?.toUpperCase() ?? 'GET')
      ? null
      : request;
  }
}

/** Reading is a right; writing is a privilege with an expiry date. */
