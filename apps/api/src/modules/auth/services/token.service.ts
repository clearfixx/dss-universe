import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import type { SignOptions } from 'jsonwebtoken';

import { RoleMapper } from '@api/core/auth/mappers/role.mapper';
import { JwtPayload } from '@api/core/auth/types/jwt-payload.type';

import { AuthTokens } from '../types/auth-tokens.type';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: RoleMapper.toCore(user.role),
    };

    const accessExpiresIn = this.configService.getOrThrow<
      SignOptions['expiresIn']
    >('JWT_ACCESS_EXPIRES_IN');

    const refreshExpiresIn = this.configService.getOrThrow<
      SignOptions['expiresIn']
    >('JWT_REFRESH_EXPIRES_IN');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}

