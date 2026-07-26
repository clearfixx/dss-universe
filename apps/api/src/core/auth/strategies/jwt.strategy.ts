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

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { JwtPayload } from '../types/jwt-payload.type';
import { PrismaService } from '@api/core/database';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const principal = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true },
    });
    if (!principal || principal.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active.');
    }
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
    };
  }
}
