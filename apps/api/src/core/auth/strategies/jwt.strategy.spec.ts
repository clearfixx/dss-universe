/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Authentication
 * 📄 File: apps/api/src/core/auth/strategies/jwt.strategy.spec.ts
 *
 * 🎯 Purpose:
 * Verifies that JWT authentication rejects non-active principals immediately.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';

import type { PrismaService } from '@api/core/database';

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const findUnique = jest.fn();
  const strategy = new JwtStrategy({
    session: { findUnique },
  } as unknown as PrismaService);
  const payload = {
    sub: 'user-1',
    ver: 0,
    sid: 'session-1',
    email: 'astro@dss.test',
    username: 'astro',
    roles: ['user'],
    permissions: [],
  };

  beforeEach(() => jest.clearAllMocks());

  const session = (
    status: UserStatus = UserStatus.ACTIVE,
    authVersion = payload.ver,
  ) => ({
    userId: payload.sub,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    user: { status, authVersion },
  });

  it('returns the authenticated principal while the account is active', async () => {
    findUnique.mockResolvedValue(session());

    await expect(strategy.validate(payload)).resolves.toMatchObject({
      id: payload.sub,
      email: payload.email,
    });
  });

  it.each([UserStatus.DEACTIVATED, UserStatus.BANNED, UserStatus.DELETED])(
    'rejects a principal with %s status',
    async (status) => {
      findUnique.mockResolvedValue(session(status));

      await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );

  it('rejects a token issued before credential rotation', async () => {
    findUnique.mockResolvedValue(session(UserStatus.ACTIVE, payload.ver + 1));

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a revoked session', async () => {
    findUnique.mockResolvedValue({ ...session(), revokedAt: new Date() });

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

/**
 * 🛰️ A valid signature identifies the token.
 * Current account state decides whether the airlock opens.
 */
