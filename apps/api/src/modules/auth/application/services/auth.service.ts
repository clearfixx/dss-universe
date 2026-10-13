/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/auth.service.ts
 *
 * 🎯 Purpose:
 * Coordinates credential enrollment, login,
 * token refresh, and logout.
 *
 * 🧠 Responsibilities:
 * • validates user credentials;
 * • reads credentials and eligibility through the Auth-owned repository;
 * • delegates credential/account-state writes to the same owned boundary;
 * • enrolls credentials through a trusted write-only storage contract;
 * • issues access and refresh tokens through TokenService;
 * • stores refresh token hashes;
 * • clears refresh token hashes during logout.
 *
 * 🏗️ Architecture:
 * Application service.
 * Owns authentication use cases and delegates hashing, token handling,
 * and credential persistence to dedicated services or repositories.
 *
 * ⚠️ Important:
 * Never store raw passwords or raw refresh tokens.
 * AuthService must not know JWT secrets or sign/verify tokens directly.
 * No profile data or Users dependency belongs in this service.
 *
 * 💡 Notes:
 * Authentication opens the airlock.
 * Authorization decides which rooms are safe to enter.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { LoginDto } from '../dto/login.dto';
import type { RefreshTokenDto } from '../dto/refresh-token.dto';
import type { CredentialSubjectStore } from '../../contracts/credential-subject-store.contract';
import type {
  AuthenticationFlows,
  AuthenticationResult,
} from '../../contracts/authentication-flows.contract';
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
import {
  ACCOUNT_CREDENTIALS_REPOSITORY,
  type AccountCredentialsRepository,
} from '../../domain/repositories/account-credentials.repository.interface';

const DUMMY_PASSWORD_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.4vA0Z8F7z7G1V1K2N1g1qjQm7u8Yw6K';

@Injectable()
export class AuthService implements AuthenticationFlows {
  constructor(
    private readonly passwordHashService: PasswordHashService,
    private readonly tokenService: TokenService,
    private readonly sessions: AuthSessionService,
    private readonly emailVerification: EmailVerificationService,
    private readonly loginProtection: LoginAbuseProtectionService,
    private readonly securityAlerts: SecurityAlertService,
    private readonly twoFactor: TwoFactorService,
    @Inject(ACCOUNT_CREDENTIALS_REPOSITORY)
    private readonly accountCredentials: AccountCredentialsRepository,
  ) {}

  async enroll(
    emailInput: string,
    password: string,
    store: CredentialSubjectStore,
  ): Promise<string> {
    const email = this.normalizeEmail(emailInput);
    const existingUser = await this.accountCredentials.findByEmail(email);

    if (existingUser) {
      throw new EmailAlreadyExistsException();
    }

    const passwordHash = await this.passwordHashService.hash(password);
    return store.create({ email, passwordHash });
  }

  async completeRegistration(
    subjectId: string,
    client: AuthClient = {},
  ): Promise<AuthenticationResult> {
    const user = await this.accountCredentials.findById(subjectId);
    if (!user || user.status !== 'ACTIVE')
      throw new InvalidCredentialsException();
    const response = await this.issueAuthResponse(subjectId, client);
    await this.emailVerification.requestAfterRegistration(
      subjectId,
      user.email,
    );
    return response;
  }

  async login(dto: LoginDto, client: AuthClient = {}) {
    const email = this.normalizeEmail(dto.email);
    await this.loginProtection.assertAllowed(email, client.ipAddress);
    const user = await this.accountCredentials.findByEmail(email);
    await this.loginProtection.assertAllowed(email, client.ipAddress, user);
    const isPasswordValid = await this.passwordHashService.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || user.status !== 'ACTIVE' || !isPasswordValid) {
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
        this.accountCredentials.findById(payload.sub),
        this.sessions.findActive(payload.sid, payload.sub),
      ]);

      if (
        !user ||
        user.status !== 'ACTIVE' ||
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

      const tokens = await this.tokenService.generateTokens(
        {
          id: user.id,
          email: user.email,
          authVersion: user.authVersion,
        },
        session.id,
      );
      const tokenHash = await this.passwordHashService.hash(
        tokens.refreshToken,
      );
      await this.sessions.rotate(session.id, user.id, tokenHash);
      return {
        subjectId: user.id,
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
    const user = await this.accountCredentials.findById(userId);
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !(await this.passwordHashService.compare(password, user.passwordHash))
    ) {
      throw new InvalidCredentialsException();
    }
    await this.accountCredentials.deactivateAccount(userId);
    return { success: true };
  }

  async reactivateAccount(dto: LoginDto, client: AuthClient = {}) {
    const email = this.normalizeEmail(dto.email);
    await this.loginProtection.assertAllowed(email, client.ipAddress);
    const user = await this.accountCredentials.findByEmail(email);
    await this.loginProtection.assertAllowed(email, client.ipAddress, user);
    const passwordValid = await this.passwordHashService.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || user.status !== 'DEACTIVATED' || !passwordValid) {
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
    await this.accountCredentials.reactivateAccount(user.id);
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
    const existing = await this.accountCredentials.findByEmail(normalizedEmail);
    if (existing) {
      throw new EmailAlreadyExistsException();
    }
    await this.accountCredentials.changeEmail(userId, normalizedEmail);
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
    await this.accountCredentials.changePasswordHash(userId, passwordHash);
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

  private async issueAuthResponse(
    userId: string,
    client: AuthClient,
  ): Promise<AuthenticationResult> {
    const user = await this.accountCredentials.findById(userId);

    if (!user || user.status !== 'ACTIVE') {
      throw new InvalidCredentialsException();
    }

    const sessionId = randomUUID();
    const tokens = await this.tokenService.generateTokens(
      {
        id: user.id,
        email: user.email,
        authVersion: user.authVersion,
      },
      sessionId,
    );
    const refreshTokenHash = await this.passwordHashService.hash(
      tokens.refreshToken,
    );
    await this.sessions.create(sessionId, user.id, refreshTokenHash, client);

    return {
      subjectId: user.id,
      tokens,
    };
  }

  private async requireActiveUserWithPassword(
    userId: string,
    password: string,
  ) {
    const user = await this.accountCredentials.findById(userId);
    if (
      !user ||
      user.status !== 'ACTIVE' ||
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
