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

const user: UserRecord = {
  id: 'user-1',
  email: 'astronaut@dss.test',
  username: 'astronaut',
  passwordHash: 'password-hash',
  displayName: 'Astronaut',
  bio: null,
  avatarUrl: null,
  coverUrl: null,
  status: UserStatus.ACTIVE,
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
  } as unknown as jest.Mocked<UsersRepository>;
  const passwordHashService = {
    compare: jest.fn(),
    hash: jest.fn(),
  } as unknown as jest.Mocked<PasswordHashService>;
  const tokenService = {
    generateTokens: jest.fn(),
    verifyRefreshToken: jest.fn(),
  } as unknown as jest.Mocked<TokenService>;
  const service = new AuthService(
    usersRepository,
    passwordHashService,
    tokenService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs in with valid credentials and persists only a refresh-token hash', async () => {
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
    expect(usersRepository.updateRefreshTokenHash.mock.calls).toContainEqual([
      user.id,
      'new-refresh-hash',
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
});
