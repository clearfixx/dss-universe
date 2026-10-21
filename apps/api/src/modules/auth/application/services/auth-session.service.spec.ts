/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/application/services/auth-session.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies bounded metadata, expiry and revocation session orchestration.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { AuthSessionRepository } from '../../domain/repositories/auth-session.repository.interface';
import { AuthSessionService } from './auth-session.service';

describe('AuthSessionService', () => {
  const repository = {
    create: jest.fn(),
    findActive: jest.fn(),
    listActive: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
    revokeOthers: jest.fn(),
  } as unknown as jest.Mocked<AuthSessionRepository>;
  const service = new AuthSessionService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('creates a seven-day session with bounded client metadata', async () => {
    const now = Date.now();
    repository.create.mockImplementation((input) =>
      Promise.resolve({
        ...input,
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    await service.create('session-1', 'user-1', 'hash', {
      userAgent: 'a'.repeat(600),
      ipAddress: '1'.repeat(80),
    });

    const input = repository.create.mock.calls[0]?.[0];
    expect(input?.userAgent).toHaveLength(512);
    expect(input?.ipAddress).toHaveLength(64);
    expect(input?.expiresAt.getTime()).toBeGreaterThanOrEqual(
      now + 7 * 24 * 60 * 60 * 1000,
    );
  });

  it('keeps the current session while revoking all others', async () => {
    repository.revokeOthers.mockResolvedValue(3);

    await expect(
      service.revokeOthers('user-1', 'session-current'),
    ).resolves.toBe(3);
    expect(repository.revokeOthers.mock.calls).toContainEqual([
      'user-1',
      'session-current',
    ]);
  });
});

/**
 * 🪪 A session is a visitor badge: identifiable, expiring and revocable.
 */
