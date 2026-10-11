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
 * • maps JwtPayload into AuthenticatedUser only after that check succeeds.
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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ACCESS_SESSION_VALIDATOR)
    private readonly sessions: AccessSessionValidator,
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
    return {
      id: payload.sub,
      sessionId: payload.sid,
      email: payload.email,
      username: payload.username,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}
