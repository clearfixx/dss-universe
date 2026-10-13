/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-access-session.repository.spec.ts
 *
 * 🎯 Purpose:
 * Checks the eligibility query allowlist and ORM-to-subject mapping at the Auth adapter boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UserStatus } from '@prisma/client';
import type { PrismaService } from '@api/core/database';
import { PrismaAccessSessionRepository } from './prisma-access-session.repository';

describe('PrismaAccessSessionRepository', () => {
  const findUnique = jest.fn();
  const repository = new PrismaAccessSessionRepository({
    session: { findUnique },
  } as unknown as PrismaService);
  const expiresAt = new Date('2026-10-12T12:00:00Z');
  beforeEach(() => jest.resetAllMocks());

  it('selects only access state and returns no profile or secrets', async () => {
    findUnique.mockResolvedValue({
      userId: 'subject-1',
      revokedAt: null,
      expiresAt,
      tokenHash: 'must-not-escape',
      user: {
        status: UserStatus.ACTIVE,
        authVersion: 2,
        email: 'private@test',
        passwordHash: 'must-not-escape',
      },
    });
    await expect(repository.findById('session-1')).resolves.toEqual({
      subjectId: 'subject-1',
      revokedAt: null,
      expiresAt,
      accountActive: true,
      authVersion: 2,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      select: {
        userId: true,
        revokedAt: true,
        expiresAt: true,
        user: { select: { status: true, authVersion: true } },
      },
    });
  });
  it.each([UserStatus.DEACTIVATED, UserStatus.BANNED, UserStatus.DELETED])(
    'maps %s to denied eligibility',
    async (status) => {
      findUnique.mockResolvedValue({
        userId: 'subject-1',
        revokedAt: null,
        expiresAt,
        user: { status, authVersion: 2 },
      });
      await expect(repository.findById('session-1')).resolves.toMatchObject({
        accountActive: false,
      });
    },
  );
  it('preserves missing session state', async () => {
    findUnique.mockResolvedValue(null);
    await expect(repository.findById('missing')).resolves.toBeNull();
  });
});
