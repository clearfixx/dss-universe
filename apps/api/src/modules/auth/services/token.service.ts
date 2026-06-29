/**
 * DSS File Passport 🛰️
 * File: apps/api/src/modules/auth/services/token.service.ts
 * Purpose: Issues JWT access and refresh tokens.
 * Phase: 2.4.5 — RBAC Core Migration
 * Architecture: Auth token service
 *
 * Notes:
 * - Tokens now contain database-driven roles and permissions.
 * - The token does not guess. The token asks Prisma. 🛰️
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import type { JwtPayload } from '@api/core/auth';
import { PrismaService } from '@api/core/database';

type TokenUserInput = {
  id: string;
  email: string;
  username: string;
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async generateTokens(user: TokenUserInput): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    return this.signTokenPair(user);
  }

  async signAccessToken(user: TokenUserInput): Promise<string> {
    const accessProfile = await this.getAccessProfile(user.id);

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

  async signTokenPair(user: TokenUserInput): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.signRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async getAccessProfile(userId: string): Promise<{
    roles: string[];
    permissions: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          select: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        key: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        directPermissions: {
          select: {
            permission: {
              select: {
                key: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return {
        roles: [],
        permissions: [],
      };
    }

    const roles = user.roles.map(({ role }) => role.name);

    const rolePermissions = user.roles.flatMap(({ role }) =>
      role.permissions.map(({ permission }) => permission.key),
    );

    const directPermissions = user.directPermissions.map(
      ({ permission }) => permission.key,
    );

    return {
      roles: Array.from(new Set<string>(roles)),
      permissions: Array.from(
        new Set<string>([...rolePermissions, ...directPermissions]),
      ),
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
