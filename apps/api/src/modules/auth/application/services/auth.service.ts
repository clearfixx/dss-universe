/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/auth.service.ts
 *
 * 🎯 Purpose:
 * Coordinates authentication use cases such as registration, login,
 * token refresh, and logout.
 *
 * 🧠 Responsibilities:
 * • validates user credentials;
 * • creates user accounts through the Users repository boundary;
 * • issues access and refresh tokens through TokenService;
 * • stores refresh token hashes;
 * • clears refresh token hashes during logout.
 *
 * 🏗️ Architecture:
 * Application service.
 * Owns authentication use cases and delegates hashing, token handling,
 * and user persistence to dedicated services or repositories.
 *
 * ⚠️ Important:
 * Never store raw passwords or raw refresh tokens.
 * AuthService must not know JWT secrets or sign/verify tokens directly.
 *
 * 💡 Notes:
 * Authentication opens the airlock.
 * Authorization decides which rooms are safe to enter.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';

import { UserMapper } from '../../../users/domain/mappers/user.mapper';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../../../users/domain/repositories/users.repository.interface';
import type { LoginDto } from '../dto/login.dto';
import type { RefreshTokenDto } from '../dto/refresh-token.dto';
import type { RegisterDto } from '../dto/register.dto';
import { EmailAlreadyExistsException } from '../../domain/exceptions/email-already-exists.exception';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import { PasswordHashService } from './password-hash.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new EmailAlreadyExistsException();
    }

    const passwordHash = await this.passwordHashService.hash(dto.password);

    const user = await this.usersRepository.create({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      passwordHash,
    });

    return this.issueAuthResponse(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await this.passwordHashService.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    return this.issueAuthResponse(user.id);
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = await this.tokenService.verifyRefreshToken(
        dto.refreshToken,
      );

      const user = await this.usersRepository.findById(payload.sub);

      if (!user || !user.refreshTokenHash) {
        throw new InvalidCredentialsException();
      }

      const isRefreshTokenValid = await this.passwordHashService.compare(
        dto.refreshToken,
        user.refreshTokenHash,
      );

      if (!isRefreshTokenValid) {
        throw new InvalidCredentialsException();
      }

      return this.issueAuthResponse(user.id);
    } catch {
      throw new InvalidCredentialsException();
    }
  }

  async logout(userId: string) {
    await this.usersRepository.updateRefreshTokenHash(userId, null);

    return { success: true };
  }

  private async issueAuthResponse(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    const tokens = await this.tokenService.generateTokens(user);
    const refreshTokenHash = await this.passwordHashService.hash(
      tokens.refreshToken,
    );

    await this.usersRepository.updateRefreshTokenHash(
      user.id,
      refreshTokenHash,
    );

    return {
      user: UserMapper.toSafeUser(user),
      tokens,
    };
  }
}
