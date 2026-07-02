/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/token.service.ts
 *
 * 🎯 Purpose:
 * Issues JWT access and refresh tokens for authenticated users.
 *
 * 🧠 Responsibilities:
 * • builds JWT payloads from authorization access profiles;
 * • signs access and refresh tokens;
 * • keeps token generation separate from login business logic.
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

type TokenUserInput = {
  id: string;
  email: string;
  username: string;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async generateTokens(user: TokenUserInput): Promise<TokenPair> {
    return this.signTokenPair(user);
  }

  async signAccessToken(user: TokenUserInput): Promise<string> {
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

  async signRefreshToken(user: TokenUserInput): Promise<string> {
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

  async signTokenPair(user: TokenUserInput): Promise<TokenPair> {
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
