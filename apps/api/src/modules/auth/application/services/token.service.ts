/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/token.service.ts
 *
 * 🎯 Purpose:
 * Issues and verifies JWT tokens for authentication flows.
 *
 * 🧠 Responsibilities:
 * • delegates access-token composition through an opaque issuance capability;
 * • coordinates the pair and signs refresh tokens;
 * • verifies refresh tokens;
 * • keeps JWT and configuration details out of AuthService.
 *
 * 🏗️ Architecture:
 * Application service.
 *
 * Auth owns refresh signing and delegates legacy access claims to composition.
 *
 * ⚠️ Important:
 * TokenService must not access Prisma directly.
 * Profile and effective permissions are composed outside Auth.
 *
 * 💡 Notes:
 * Auth supplies identity facts; composition asks the other owners. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import { JwtService } from '@nestjs/jwt';

import {
  ACCESS_TOKEN_ISSUER,
  type AccessTokenIssuer,
} from '../../contracts/access-token-issuer.contract';

import type { TokenPair } from '../types/token-pair.type';
import type { RefreshTokenClaims } from '../types/refresh-token-claims.type';
import type { TokenSubject } from '../../contracts/token-subject.type';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(ACCESS_TOKEN_ISSUER)
    private readonly accessTokenIssuer: AccessTokenIssuer,
  ) {}

  async generateTokens(
    user: TokenSubject,
    sessionId: string,
  ): Promise<TokenPair> {
    return this.signTokenPair(user, sessionId);
  }

  async signAccessToken(
    user: TokenSubject,
    sessionId: string,
  ): Promise<string> {
    return this.accessTokenIssuer.issue(
      { id: user.id, email: user.email, authVersion: user.authVersion },
      sessionId,
    );
  }

  async signRefreshToken(
    user: TokenSubject,
    sessionId: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        ver: user.authVersion,
        sid: sessionId,
      },
      {
        secret: this.getJwtRefreshSecret(),
        expiresIn: this.getJwtRefreshExpiresIn(),
      },
    );
  }

  async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenClaims> {
    const claims = await this.jwtService.verifyAsync<RefreshTokenClaims>(
      refreshToken,
      {
        secret: this.getJwtRefreshSecret(),
      },
    );
    return { sub: claims.sub, sid: claims.sid, ver: claims.ver };
  }

  async signTokenPair(
    user: TokenSubject,
    sessionId: string,
  ): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user, sessionId),
      this.signRefreshToken(user, sessionId),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private getJwtRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured.');
    }

    return secret;
  }

  private getJwtRefreshExpiresIn(): JwtSignOptions['expiresIn'] {
    return '7d';
  }
}
