/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🔐 Module: Authentication
 * 📄 File: jwt.strategy.ts
 *
 * 🎯 Purpose:
 * Validates access tokens and creates the authenticated request user.
 *
 * 🧠 Responsibilities:
 * • extracts JWT from Authorization Bearer header;
 * • validates token expiration and signature;
 * • maps JwtPayload into AuthenticatedUser.
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
 *
 * 💡 Notes:
 * If this strategy accepts the token,
 * the airlock opens. Make sure it opens for the right astronaut. 🧑‍🚀
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}
