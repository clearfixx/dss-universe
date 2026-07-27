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
import type { Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import type { Observable } from 'rxjs';

import type { AuthenticatedRequest } from '@api/core/auth';

import { UserPresenceService } from '../../application/services/user-presence.service';

@Injectable()
export class UserPresenceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UserPresenceInterceptor.name);
  private readonly anonymousVisitors = new WeakMap<object, string>();

  constructor(private readonly presence: UserPresenceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const { request, response } = this.httpFrom(context);
    if (this.isProductRequest(request.originalUrl)) {
      const refresh = request.user
        ? this.presence.touch(
            request.user.id,
            this.presenceCookie(request.get('cookie')) ?? undefined,
          )
        : this.touchAnonymous(request, response);
      void refresh.catch((error: unknown) => {
        this.logger.warn(
          `Presence refresh failed: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      });
    }
    return next.handle();
  }

  private httpFrom(context: ExecutionContext): {
    request: AuthenticatedRequest;
    response: Response;
  } {
    if (context.getType<string>() === 'graphql') {
      const graphql = GqlExecutionContext.create(context).getContext<{
        req: AuthenticatedRequest;
        res: Response;
      }>();
      return { request: graphql.req, response: graphql.res };
    }
    const http = context.switchToHttp();
    return {
      request: http.getRequest<AuthenticatedRequest>(),
      response: http.getResponse<Response>(),
    };
  }

  private touchAnonymous(
    request: AuthenticatedRequest,
    response: Response,
  ): Promise<void> {
    const userAgent = request.get('user-agent') ?? 'unknown';
    if (this.isCrawler(userAgent)) {
      const visitorId = createHash('sha256')
        .update(`${request.ip}|${userAgent}`)
        .digest('hex')
        .slice(0, 32);
      return this.presence.touchAnonymous(visitorId, userAgent);
    }

    const existing = this.presenceCookie(request.get('cookie'));
    const remembered = this.anonymousVisitors.get(request);
    const visitorId = existing ?? remembered ?? randomUUID();
    if (!remembered) {
      this.anonymousVisitors.set(request, visitorId);
      response.cookie('dss_presence', visitorId, {
        httpOnly: true,
        maxAge: 300_000,
        sameSite: 'lax',
        secure: request.secure,
      });
    }
    return this.presence.touchAnonymous(visitorId, userAgent);
  }

  private presenceCookie(cookieHeader: string | undefined): string | null {
    const value = cookieHeader
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('dss_presence='))
      ?.slice('dss_presence='.length);
    return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
  }

  private isCrawler(userAgent: string): boolean {
    return /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|google-inspectiontool|lighthouse/i.test(
      userAgent,
    );
  }

  private isProductRequest(originalUrl: string): boolean {
    return originalUrl.startsWith('/api/graphql');
  }
}

/**
 * 🍪 Five-minute presence cookies count visitors; they do not follow
 * astronauts across the galaxy.
 */
