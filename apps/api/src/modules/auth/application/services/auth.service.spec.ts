/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/auth.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies the critical authentication orchestration contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UserStatus } from '@prisma/client';

import type { UsersRepository } from '../../../users/domain/repositories/users.repository.interface';
import type { UserRecord } from '../../../users/domain/types/user-record.type';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import { TwoFactorRequiredException } from '../../domain/exceptions/two-factor-required.exception';
import type { AccountCredentials } from '../../domain/types/account-credentials.type';
import type { AccountCredentialsRepository } from '../../domain/repositories/account-credentials.repository.interface';
import { AuthService } from './auth.service';
import type { PasswordHashService } from './password-hash.service';
import type { TokenService } from './token.service';
import type { AuthSessionService } from './auth-session.service';
import type { EmailVerificationService } from './email-verification.service';
import type { LoginAbuseProtectionService } from './login-abuse-protection.service';
import type { SecurityAlertService } from './security-alert.service';
import type { TwoFactorService } from './two-factor.service';

const user: UserRecord = {
  id: 'user-1',
  email: 'astronaut@dss.test',
  username: 'astronaut',
  passwordHash: 'password-hash',
  displayName: 'Astronaut',
  bio: null,
  location: null,
  website: null,
  technologies: [],
  interests: [],
  avatarUrl: null,
  coverUrl: null,
  status: UserStatus.ACTIVE,
  deactivatedAt: null,
  authVersion: 0,
  refreshTokenHash: 'refresh-hash',
  emailVerifiedAt: null,
  lastSeenAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const credentials: AccountCredentials = {
  id: user.id,
  email: user.email,
  passwordHash: user.passwordHash,
  status: 'ACTIVE',
  authVersion: 0,
  loginFailedAttempts: 0,
  loginLockedUntil: null,
};

describe('AuthService', () => {
  const usersRepository = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
  const accountCredentials: jest.Mocked<AccountCredentialsRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    deactivateAccount: jest.fn(),
    reactivateAccount: jest.fn(),
    changeEmail: jest.fn(),
    changePasswordHash: jest.fn(),
  };
  const passwordHashService = {
    compare: jest.fn(),
    hash: jest.fn(),
  } as unknown as jest.Mocked<PasswordHashService>;
  const tokenService = {
    generateTokens: jest.fn(),
    verifyRefreshToken: jest.fn(),
  } as unknown as jest.Mocked<TokenService>;
  const sessions = {
    create: jest.fn(),
    findActive: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
    list: jest.fn(),
    revokeOthers: jest.fn(),
  } as unknown as jest.Mocked<AuthSessionService>;
  const emailVerification = {
    requestAfterRegistration: jest.fn(),
  } as unknown as jest.Mocked<EmailVerificationService>;
  const loginProtection = {
    assertAllowed: jest.fn(),
    recordFailure: jest.fn(),
    recordSuccess: jest.fn(),
  } as unknown as jest.Mocked<LoginAbuseProtectionService>;
  const securityAlerts = {
    notify: jest.fn(),
  } as unknown as jest.Mocked<SecurityAlertService>;
  const twoFactor = {
    assertLogin: jest.fn(),
  } as unknown as jest.Mocked<TwoFactorService>;
  const service = new AuthService(
    usersRepository,
    passwordHashService,
    tokenService,
    sessions,
    emailVerification,
    loginProtection,
    securityAlerts,
    twoFactor,
    accountCredentials,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    twoFactor.assertLogin.mockResolvedValue(undefined);
    usersRepository.findById.mockResolvedValue(user);
    accountCredentials.findById.mockResolvedValue(credentials);
  });

  it('logs in with valid credentials and persists a hashed device session', async () => {
    accountCredentials.findByEmail.mockResolvedValue(credentials);
    accountCredentials.findById.mockResolvedValue(credentials);
    passwordHashService.compare.mockResolvedValue(true);
    tokenService.generateTokens.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    passwordHashService.hash.mockResolvedValue('new-refresh-hash');

    const result = await service.login({
      email: user.email,
      password: 'correct-password',
    });

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('refreshTokenHash');
    expect(result.tokens.accessToken).toBe('access-token');
    expect(tokenService.generateTokens.mock.calls[0]).toEqual([
      {
        id: credentials.id,
        email: credentials.email,
        authVersion: credentials.authVersion,
      },
      expect.any(String),
    ]);
    expect(passwordHashService.hash.mock.calls).toContainEqual([
      'refresh-token',
    ]);
    expect(sessions.create.mock.calls).toContainEqual([
      expect.any(String) as string,
      user.id,
      'new-refresh-hash',
      {},
    ]);
    expect(twoFactor.assertLogin.mock.calls).toContainEqual([
      user.id,
      undefined,
    ]);
  });

  it('uses the dummy password path for unknown credentials without loading a profile', async () => {
    accountCredentials.findByEmail.mockResolvedValue(null);
    passwordHashService.compare.mockResolvedValue(false);
    await expect(
      service.login({ email: 'unknown@dss.test', password: 'wrong' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(passwordHashService.compare.mock.calls[0]).toEqual([
      'wrong',
      expect.any(String),
    ]);
    expect(usersRepository.findById.mock.calls).toHaveLength(0);
    expect(tokenService.generateTokens.mock.calls).toHaveLength(0);
  });

  it('never falls back to Users when credential authority is unavailable', async () => {
    const error = new Error('credential authority unavailable');
    accountCredentials.findByEmail.mockRejectedValue(error);
    await expect(
      service.login({ email: user.email, password: 'correct-password' }),
    ).rejects.toBe(error);
    expect(usersRepository.findById.mock.calls).toHaveLength(0);
    expect(tokenService.generateTokens.mock.calls).toHaveLength(0);
  });

  it('keeps credential version authoritative when refreshing legacy profile claims', async () => {
    tokenService.verifyRefreshToken.mockResolvedValue({
      sub: credentials.id,
      sid: 'session-1',
      ver: credentials.authVersion,
    });
    sessions.findActive.mockResolvedValue({
      id: 'session-1',
      userId: credentials.id,
      tokenHash: 'private-token-hash',
      userAgent: null,
      ipAddress: null,
      expiresAt: new Date('2099-01-01'),
      revokedAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });
    usersRepository.findById.mockResolvedValue({ ...user, authVersion: 99 });
    passwordHashService.compare.mockResolvedValue(true);
    passwordHashService.hash.mockResolvedValue('rotated-hash');
    tokenService.generateTokens.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    const result = await service.refresh({ refreshToken: 'old-refresh' });
    expect(result.tokens).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    expect(tokenService.generateTokens.mock.calls[0]).toEqual([
      {
        id: credentials.id,
        email: credentials.email,
        authVersion: credentials.authVersion,
      },
      'session-1',
    ]);
    expect(sessions.rotate.mock.calls[0]).toEqual([
      'session-1',
      credentials.id,
      'rotated-hash',
    ]);
  });

  it('rejects invalid passwords without issuing tokens', async () => {
    accountCredentials.findByEmail.mockResolvedValue(credentials);
    passwordHashService.compare.mockResolvedValue(false);

    await expect(
      service.login({ email: user.email, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(tokenService.generateTokens.mock.calls).toHaveLength(0);
  });

  it('requires 2FA after password verification without counting a missing code as abuse', async () => {
    accountCredentials.findByEmail.mockResolvedValue(credentials);
    passwordHashService.compare.mockResolvedValue(true);
    twoFactor.assertLogin.mockRejectedValue(new TwoFactorRequiredException());

    await expect(
      service.login({ email: user.email, password: 'correct-password' }),
    ).rejects.toBeInstanceOf(TwoFactorRequiredException);
    expect(loginProtection.recordFailure.mock.calls).toHaveLength(0);
    expect(tokenService.generateTokens.mock.calls).toHaveLength(0);
  });

  it('counts an invalid submitted second factor as a failed login', async () => {
    accountCredentials.findByEmail.mockResolvedValue(credentials);
    passwordHashService.compare.mockResolvedValue(true);
    twoFactor.assertLogin.mockRejectedValue(new TwoFactorRequiredException());

    await expect(
      service.login({
        email: user.email,
        password: 'correct-password',
        twoFactorCode: '123456',
      }),
    ).rejects.toBeInstanceOf(TwoFactorRequiredException);
    expect(loginProtection.recordFailure.mock.calls).toContainEqual([
      user.email,
      undefined,
      credentials,
      {},
    ]);
  });

  it('normalizes refresh verification failures to invalid credentials', async () => {
    tokenService.verifyRefreshToken.mockRejectedValue(
      new Error('expired token'),
    );

    await expect(
      service.refresh({ refreshToken: 'expired-refresh-token' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('deactivates an active account only after password confirmation', async () => {
    accountCredentials.findById.mockResolvedValue(credentials);
    passwordHashService.compare.mockResolvedValue(true);
    accountCredentials.deactivateAccount.mockResolvedValue(undefined);

    await expect(
      service.deactivateAccount(user.id, 'correct-password'),
    ).resolves.toEqual({ success: true });
    expect(accountCredentials.deactivateAccount.mock.calls).toContainEqual([
      user.id,
    ]);
  });

  it('reactivates only a deactivated account and rotates its tokens', async () => {
    const deactivated = {
      ...credentials,
      status: UserStatus.DEACTIVATED,
    };
    accountCredentials.findByEmail.mockResolvedValue(deactivated);
    accountCredentials.reactivateAccount.mockResolvedValue(undefined);
    accountCredentials.findById.mockResolvedValue(credentials);
    passwordHashService.compare.mockResolvedValue(true);
    passwordHashService.hash.mockResolvedValue('rotated-refresh-hash');
    tokenService.generateTokens.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    await expect(
      service.reactivateAccount({
        email: user.email,
        password: 'correct-password',
      }),
    ).resolves.toMatchObject({ user: { status: UserStatus.ACTIVE } });
    expect(twoFactor.assertLogin.mock.calls).toContainEqual([
      user.id,
      undefined,
    ]);
    expect(accountCredentials.reactivateAccount.mock.calls).toContainEqual([
      user.id,
    ]);
  });

  it('rejects normal login for a deactivated account', async () => {
    accountCredentials.findByEmail.mockResolvedValue({
      ...credentials,
      status: UserStatus.DEACTIVATED,
    });

    await expect(
      service.login({ email: user.email, password: 'correct-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(passwordHashService.compare.mock.calls).toContainEqual([
      'correct-password',
      user.passwordHash,
    ]);
    expect(loginProtection.recordFailure.mock.calls).toContainEqual([
      user.email,
      undefined,
      expect.objectContaining({ id: user.id }),
      {},
    ]);
  });

  it('normalizes and changes email after credential confirmation', async () => {
    accountCredentials.findById.mockResolvedValue(credentials);
    accountCredentials.findByEmail.mockResolvedValue(null);
    passwordHashService.compare.mockResolvedValue(true);
    accountCredentials.changeEmail.mockResolvedValue(undefined);

    await expect(
      service.changeEmail(user.id, '  NEW@DSS.TEST ', 'correct-password'),
    ).resolves.toEqual({ success: true });
    expect(accountCredentials.changeEmail.mock.calls).toContainEqual([
      user.id,
      'new@dss.test',
    ]);
  });

  it('rotates the password hash after current-password confirmation', async () => {
    accountCredentials.findById.mockResolvedValue(credentials);
    passwordHashService.compare.mockResolvedValue(true);
    passwordHashService.hash.mockResolvedValue('next-password-hash');
    accountCredentials.changePasswordHash.mockResolvedValue(undefined);

    await expect(
      service.changePassword(user.id, 'current-password', 'next-password'),
    ).resolves.toEqual({ success: true });
    expect(passwordHashService.hash.mock.calls).toContainEqual([
      'next-password',
    ]);
    expect(accountCredentials.changePasswordHash.mock.calls).toContainEqual([
      user.id,
      'next-password-hash',
    ]);
  });
});
