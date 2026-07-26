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
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      select: {
        userId: true,
        revokedAt: true,
        expiresAt: true,
        user: { select: { status: true, authVersion: true } },
      },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.status !== UserStatus.ACTIVE ||
      session.user.authVersion !== payload.ver
    ) {
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
