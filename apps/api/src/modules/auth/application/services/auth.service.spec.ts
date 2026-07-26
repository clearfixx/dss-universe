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
import { AuthService } from './auth.service';
import type { PasswordHashService } from './password-hash.service';
import type { TokenService } from './token.service';
import type { AuthSessionService } from './auth-session.service';

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

describe('AuthService', () => {
  const usersRepository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
    deactivateAccount: jest.fn(),
    reactivateAccount: jest.fn(),
    changeEmail: jest.fn(),
    changePasswordHash: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
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
  const service = new AuthService(
    usersRepository,
    passwordHashService,
    tokenService,
    sessions,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs in with valid credentials and persists a hashed device session', async () => {
    usersRepository.findByEmail.mockResolvedValue(user);
    usersRepository.findById.mockResolvedValue(user);
    passwordHashService.compare.mockResolvedValue(true);
    tokenService.generateTokens.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    passwordHashService.hash.mockResolvedValue('new-refresh-hash');
    usersRepository.updateRefreshTokenHash.mockResolvedValue(user);

    const result = await service.login({
      email: user.email,
      password: 'correct-password',
    });

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('refreshTokenHash');
    expect(result.tokens.accessToken).toBe('access-token');
    expect(passwordHashService.hash.mock.calls).toContainEqual([
      'refresh-token',
    ]);
    expect(sessions.create.mock.calls).toContainEqual([
      expect.any(String) as string,
      user.id,
      'new-refresh-hash',
      {},
    ]);
  });

  it('rejects invalid passwords without issuing tokens', async () => {
    usersRepository.findByEmail.mockResolvedValue(user);
    passwordHashService.compare.mockResolvedValue(false);

    await expect(
      service.login({ email: user.email, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(tokenService.generateTokens.mock.calls).toHaveLength(0);
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
    usersRepository.findById.mockResolvedValue(user);
    passwordHashService.compare.mockResolvedValue(true);
    usersRepository.deactivateAccount.mockResolvedValue({
      ...user,
      status: UserStatus.DEACTIVATED,
      deactivatedAt: new Date(),
    });

    await expect(
      service.deactivateAccount(user.id, 'correct-password'),
    ).resolves.toEqual({ success: true });
    expect(usersRepository.deactivateAccount.mock.calls).toContainEqual([
      user.id,
    ]);
  });

  it('reactivates only a deactivated account and rotates its tokens', async () => {
    const deactivated = {
      ...user,
      status: UserStatus.DEACTIVATED,
      deactivatedAt: new Date(),
    };
    usersRepository.findByEmail.mockResolvedValue(deactivated);
    usersRepository.reactivateAccount.mockResolvedValue(user);
    usersRepository.findById.mockResolvedValue(user);
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
    expect(usersRepository.reactivateAccount.mock.calls).toContainEqual([
      user.id,
    ]);
  });

  it('rejects normal login for a deactivated account', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      ...user,
      status: UserStatus.DEACTIVATED,
      deactivatedAt: new Date(),
    });

    await expect(
      service.login({ email: user.email, password: 'correct-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(passwordHashService.compare.mock.calls).toHaveLength(0);
  });

  it('normalizes and changes email after credential confirmation', async () => {
    usersRepository.findById.mockResolvedValue(user);
    usersRepository.findByEmail.mockResolvedValue(null);
    passwordHashService.compare.mockResolvedValue(true);
    usersRepository.changeEmail.mockResolvedValue({
      ...user,
      email: 'new@dss.test',
      emailVerifiedAt: null,
      authVersion: 1,
    });

    await expect(
      service.changeEmail(user.id, '  NEW@DSS.TEST ', 'correct-password'),
    ).resolves.toEqual({ success: true });
    expect(usersRepository.changeEmail.mock.calls).toContainEqual([
      user.id,
      'new@dss.test',
    ]);
  });

  it('rotates the password hash after current-password confirmation', async () => {
    usersRepository.findById.mockResolvedValue(user);
    passwordHashService.compare.mockResolvedValue(true);
    passwordHashService.hash.mockResolvedValue('next-password-hash');
    usersRepository.changePasswordHash.mockResolvedValue({
      ...user,
      passwordHash: 'next-password-hash',
      authVersion: 1,
    });

    await expect(
      service.changePassword(user.id, 'current-password', 'next-password'),
    ).resolves.toEqual({ success: true });
    expect(passwordHashService.hash.mock.calls).toContainEqual([
      'next-password',
    ]);
    expect(usersRepository.changePasswordHash.mock.calls).toContainEqual([
      user.id,
      'next-password-hash',
    ]);
  });
});
