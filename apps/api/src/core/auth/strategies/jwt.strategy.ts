/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Authentication
 * 📄 File: apps/api/src/core/auth/strategies/jwt.strategy.ts
 *
 * 🎯 Purpose:
 * Validates access tokens and creates the authenticated request user.
 *
 * 🧠 Responsibilities:
 * • extracts JWT from Authorization Bearer header;
 * • validates token expiration and signature;
 * • checks current session eligibility through a consumer-owned capability;
 * • loads current access context through a separate request capability;
 * • creates AuthenticatedUser only after both authoritative reads succeed.
 *
 * 🏗️ Architecture:
 * Passport JWT strategy.
 *
 * TokenService
 *   ↓
 * JWT
 *   ↓
 * JwtStrategy
 *   ↓
 * request.user
 *
 * ⚠️ Important:
 * This strategy must stay aligned with TokenService and JwtPayload.
 * It must not read Prisma/User records or own account eligibility policy.
 * Roles/permissions in JWTs are compatibility claims, never current access authority.
 *
 * 💡 Notes:
 * If this strategy accepts the token,
 * the airlock opens. Make sure it opens for the right astronaut. 🧑‍🚀
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { JwtPayload } from '../types/jwt-payload.type';
import {
  ACCESS_SESSION_VALIDATOR,
  type AccessSessionValidator,
} from '../contracts/access-session-validator.interface';
import {
  REQUEST_ACCESS_READER,
  type RequestAccessReader,
} from '../contracts/request-access-reader.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ACCESS_SESSION_VALIDATOR)
    private readonly sessions: AccessSessionValidator,
    @Inject(REQUEST_ACCESS_READER)
    private readonly access: RequestAccessReader,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const active = await this.sessions.isActive({
      subjectId: payload.sub,
      sessionId: payload.sid,
      authVersion: payload.ver,
    });
    if (!active) {
      throw new UnauthorizedException('Account is not active.');
    }
    const access = await this.access.readForSubject(payload.sub);
    return {
      id: payload.sub,
      sessionId: payload.sid,
      email: payload.email,
      username: payload.username,
      roles: [...access.roles],
      permissions: [...access.permissions],
    };
  }
}
