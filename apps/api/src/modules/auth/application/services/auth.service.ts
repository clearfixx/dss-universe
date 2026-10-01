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
import { UserStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';

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
import { AuthSessionService } from './auth-session.service';
import type { AuthClient } from '../types/auth-client.type';
import { EmailVerificationService } from './email-verification.service';
import { LoginAbuseProtectionService } from './login-abuse-protection.service';
import { SecurityAlertService } from './security-alert.service';
import { TwoFactorService } from './two-factor.service';

const DUMMY_PASSWORD_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.4vA0Z8F7z7G1V1K2N1g1qjQm7u8Yw6K';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly tokenService: TokenService,
    private readonly sessions: AuthSessionService,
    private readonly emailVerification: EmailVerificationService,
    private readonly loginProtection: LoginAbuseProtectionService,
    private readonly securityAlerts: SecurityAlertService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  async register(dto: RegisterDto, client: AuthClient = {}) {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new EmailAlreadyExistsException();
    }

    const passwordHash = await this.passwordHashService.hash(dto.password);

    const user = await this.usersRepository.create({
      email,
      username: dto.username,
      displayName: dto.displayName,
      passwordHash,
    });

    const response = await this.issueAuthResponse(user.id, client);
    await this.emailVerification.requestAfterRegistration(user.id, user.email);
    return response;
  }

  async login(dto: LoginDto, client: AuthClient = {}) {
    const email = this.normalizeEmail(dto.email);
    await this.loginProtection.assertAllowed(email, client.ipAddress);
    const user = await this.usersRepository.findByEmail(email);
    await this.loginProtection.assertAllowed(email, client.ipAddress, user);
    const isPasswordValid = await this.passwordHashService.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || user.status !== UserStatus.ACTIVE || !isPasswordValid) {
      await this.loginProtection.recordFailure(
        email,
        client.ipAddress,
        user,
        client,
      );
      throw new InvalidCredentialsException();
    }
    try {
      await this.twoFactor.assertLogin(user.id, dto.twoFactorCode);
    } catch (error) {
      if (dto.twoFactorCode) {
        await this.loginProtection.recordFailure(
          email,
          client.ipAddress,
          user,
          client,
        );
      }
      throw error;
    }
    await this.loginProtection.recordSuccess(email, user, client);
    return this.issueAuthResponse(user.id, client);
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = await this.tokenService.verifyRefreshToken(
        dto.refreshToken,
      );

      const [user, session] = await Promise.all([
        this.usersRepository.findById(payload.sub),
        this.sessions.findActive(payload.sid, payload.sub),
      ]);

      if (
        !user ||
        user.status !== UserStatus.ACTIVE ||
        user.authVersion !== payload.ver ||
        !session
      ) {
        throw new InvalidCredentialsException();
      }

      const isRefreshTokenValid = await this.passwordHashService.compare(
        dto.refreshToken,
        session.tokenHash,
      );

      if (!isRefreshTokenValid) {
        throw new InvalidCredentialsException();
      }

      const tokens = await this.tokenService.generateTokens(user, session.id);
      const tokenHash = await this.passwordHashService.hash(
        tokens.refreshToken,
      );
      await this.sessions.rotate(session.id, user.id, tokenHash);
      return {
        user: UserMapper.toSafeUser(user),
        tokens,
      };
    } catch {
      throw new InvalidCredentialsException();
    }
  }

  async logout(userId: string, sessionId: string) {
    await this.sessions.revoke(sessionId, userId);
    return { success: true };
  }

  async deactivateAccount(userId: string, password: string) {
    const user = await this.usersRepository.findById(userId);
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !(await this.passwordHashService.compare(password, user.passwordHash))
    ) {
      throw new InvalidCredentialsException();
    }
    await this.usersRepository.deactivateAccount(userId);
    return { success: true };
  }

  async reactivateAccount(dto: LoginDto, client: AuthClient = {}) {
    const email = this.normalizeEmail(dto.email);
    await this.loginProtection.assertAllowed(email, client.ipAddress);
    const user = await this.usersRepository.findByEmail(email);
    await this.loginProtection.assertAllowed(email, client.ipAddress, user);
    const passwordValid = await this.passwordHashService.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || user.status !== UserStatus.DEACTIVATED || !passwordValid) {
      await this.loginProtection.recordFailure(
        email,
        client.ipAddress,
        user,
        client,
      );
      throw new InvalidCredentialsException();
    }
    try {
      await this.twoFactor.assertLogin(user.id, dto.twoFactorCode);
    } catch (error) {
      if (dto.twoFactorCode) {
        await this.loginProtection.recordFailure(
          email,
          client.ipAddress,
          user,
          client,
        );
      }
      throw error;
    }
    await this.loginProtection.recordSuccess(email, user, client);
    await this.usersRepository.reactivateAccount(user.id);
    return this.issueAuthResponse(user.id, client);
  }

  async changeEmail(userId: string, email: string, currentPassword: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.requireActiveUserWithPassword(
      userId,
      currentPassword,
    );
    if (normalizedEmail === user.email.toLowerCase()) {
      return { success: true };
    }
    const existing = await this.usersRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new EmailAlreadyExistsException();
    }
    await this.usersRepository.changeEmail(userId, normalizedEmail);
    await this.securityAlerts.notify('EMAIL_CHANGED', user.email);
    return { success: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.requireActiveUserWithPassword(
      userId,
      currentPassword,
    );
    const passwordHash = await this.passwordHashService.hash(newPassword);
    await this.usersRepository.changePasswordHash(userId, passwordHash);
    await this.securityAlerts.notify('PASSWORD_CHANGED', user.email);
    return { success: true };
  }

  listSessions(userId: string) {
    return this.sessions.list(userId);
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.sessions.revoke(sessionId, userId);
    return { success: true };
  }

  async revokeOtherSessions(userId: string, currentSessionId: string) {
    const revokedCount = await this.sessions.revokeOthers(
      userId,
      currentSessionId,
    );
    return { success: true, revokedCount };
  }

  private async issueAuthResponse(userId: string, client: AuthClient) {
    const user = await this.usersRepository.findById(userId);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new InvalidCredentialsException();
    }

    const sessionId = randomUUID();
    const tokens = await this.tokenService.generateTokens(user, sessionId);
    const refreshTokenHash = await this.passwordHashService.hash(
      tokens.refreshToken,
    );
    await this.sessions.create(sessionId, user.id, refreshTokenHash, client);

    return {
      user: UserMapper.toSafeUser(user),
      tokens,
    };
  }

  private async requireActiveUserWithPassword(
    userId: string,
    password: string,
  ) {
    const user = await this.usersRepository.findById(userId);
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !(await this.passwordHashService.compare(password, user.passwordHash))
    ) {
      throw new InvalidCredentialsException();
    }
    return user;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
