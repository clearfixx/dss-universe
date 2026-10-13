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

const user: AccountCredentials = {
  id: 'user-1',
  email: 'astronaut@dss.test',
  passwordHash: 'password-hash',
  status: 'ACTIVE',
  authVersion: 0,
  loginFailedAttempts: 0,
  loginLockedUntil: null,
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
    accountCredentials.findById.mockResolvedValue(credentials);
  });

  it('enrolls normalized credentials through a write-only store without a profile', async () => {
    accountCredentials.findByEmail.mockResolvedValue(null);
    passwordHashService.hash.mockResolvedValue('credential-hash');
    const store = { create: jest.fn().mockResolvedValue(user.id) };
    await expect(
      service.enroll('  ASTRONAUT@DSS.TEST ', 'password', store),
    ).resolves.toBe(user.id);
    expect(store.create).toHaveBeenCalledWith({
      email: user.email,
      passwordHash: 'credential-hash',
    });
    expect(tokenService.generateTokens.mock.calls).toHaveLength(0);
    expect(emailVerification.requestAfterRegistration.mock.calls).toHaveLength(
      0,
    );
  });

  it('does not hash or persist an already registered email', async () => {
    accountCredentials.findByEmail.mockResolvedValue(credentials);
    const store = { create: jest.fn() };
    await expect(service.enroll(user.email, 'password', store)).rejects.toThrow(
      'User with this email already exists',
    );
    expect(passwordHashService.hash.mock.calls).toHaveLength(0);
    expect(store.create).not.toHaveBeenCalled();
  });

  it('propagates enrollment failure without creating a session or sending mail', async () => {
    accountCredentials.findByEmail.mockResolvedValue(null);
    passwordHashService.hash.mockResolvedValue('credential-hash');
    const error = new Error('transaction failed');
    const store = { create: jest.fn().mockRejectedValue(error) };
    await expect(service.enroll(user.email, 'password', store)).rejects.toBe(
      error,
    );
    expect(sessions.create.mock.calls).toHaveLength(0);
    expect(emailVerification.requestAfterRegistration.mock.calls).toHaveLength(
      0,
    );
  });

  it('rejects completion for an unavailable account without tokens or mail', async () => {
    accountCredentials.findById.mockResolvedValue({
      ...credentials,
      status: 'BANNED',
    });
    await expect(service.completeRegistration(user.id)).rejects.toBeInstanceOf(
      InvalidCredentialsException,
    );
    expect(tokenService.generateTokens.mock.calls).toHaveLength(0);
    expect(emailVerification.requestAfterRegistration.mock.calls).toHaveLength(
      0,
    );
  });

  it('persists the registration session before requesting verification mail', async () => {
    tokenService.generateTokens.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    passwordHashService.hash.mockResolvedValue('refresh-hash');
    await expect(service.completeRegistration(user.id)).resolves.toEqual({
      subjectId: user.id,
      tokens: { accessToken: 'access', refreshToken: 'refresh' },
    });
    expect(sessions.create.mock.invocationCallOrder[0]).toBeLessThan(
      emailVerification.requestAfterRegistration.mock.invocationCallOrder[0],
    );
    expect(emailVerification.requestAfterRegistration.mock.calls[0]).toEqual([
      user.id,
      user.email,
    ]);
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

    expect(Object.keys(result).sort()).toEqual(['subjectId', 'tokens']);
    expect(result.subjectId).toBe(credentials.id);
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
    expect(tokenService.generateTokens.mock.calls).toHaveLength(0);
  });

  it('never falls back to Users when credential authority is unavailable', async () => {
    const error = new Error('credential authority unavailable');
    accountCredentials.findByEmail.mockRejectedValue(error);
    await expect(
      service.login({ email: user.email, password: 'correct-password' }),
    ).rejects.toBe(error);
    expect(tokenService.generateTokens.mock.calls).toHaveLength(0);
  });

  it('uses the authoritative credential version when rotating a session', async () => {
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
    const deactivated: AccountCredentials = {
      ...credentials,
      status: 'DEACTIVATED',
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
    ).resolves.toMatchObject({ subjectId: user.id });
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
      status: 'DEACTIVATED',
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
