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
 * • builds access-token payloads from authorization access profiles;
 * • signs access and refresh tokens;
 * • verifies refresh tokens;
 * • keeps JWT and configuration details out of AuthService.
 *
 * 🏗️ Architecture:
 * Application service.
 *
 * TokenService
 *   ↓
 * PermissionsService
 *   ↓
 * PermissionsRepository
 *   ↓
 * Prisma
 *
 * ⚠️ Important:
 * TokenService must not access Prisma directly.
 * Effective roles and permissions belong to Authorization Core.
 *
 * 💡 Notes:
 * The token does not guess.
 * The token asks Authorization. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import { JwtService } from '@nestjs/jwt';

import type { JwtPayload } from '@api/core/auth';
import { PermissionsService } from '@api/core/authorization';

import type { TokenPair } from '../types/token-pair.type';
import type { TokenUser } from '../types/token-user.type';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async generateTokens(user: TokenUser): Promise<TokenPair> {
    return this.signTokenPair(user);
  }

  async signAccessToken(user: TokenUser): Promise<string> {
    const accessProfile =
      await this.permissionsService.getAccessProfileByUserId(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: accessProfile.roles,
      permissions: accessProfile.permissions,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.getJwtAccessSecret(),
      expiresIn: this.getJwtAccessExpiresIn(),
    });
  }

  async signRefreshToken(user: TokenUser): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
      },
      {
        secret: this.getJwtRefreshSecret(),
        expiresIn: this.getJwtRefreshExpiresIn(),
      },
    );
  }

  async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
      secret: this.getJwtRefreshSecret(),
    });
  }

  async signTokenPair(user: TokenUser): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.signRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private getJwtAccessSecret(): string {
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not configured.');
    }

    return secret;
  }

  private getJwtRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured.');
    }

    return secret;
  }

  private getJwtAccessExpiresIn(): JwtSignOptions['expiresIn'] {
    return '15m';
  }

  private getJwtRefreshExpiresIn(): JwtSignOptions['expiresIn'] {
    return '7d';
  }
}
