/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-profile-display.reader.spec.ts
 *
 * 🎯 Purpose:
 * Verifies the username-only selection and absence of secret/profile aggregates.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService } from '@api/core/database';
import { PrismaProfileDisplayReader } from './prisma-profile-display.reader';

describe('PrismaProfileDisplayReader', () => {
  const findUnique = jest.fn<Promise<{ username: string } | null>, [unknown]>();
  const reader = new PrismaProfileDisplayReader({
    user: { findUnique },
  } as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('selects a single field and returns a scalar even if the runtime row has extras', async () => {
    const row = {
      username: 'explorer',
      passwordHash: 'private',
      authVersion: 99,
    };
    findUnique.mockResolvedValue(row);
    expect(await reader.findUsername('subject-1')).toBe('explorer');
    expect(findUnique.mock.calls).toEqual([
      [{ where: { id: 'subject-1' }, select: { username: true } }],
    ]);
  });

  it('returns null for a missing profile', async () => {
    findUnique.mockResolvedValue(null);
    expect(await reader.findUsername('missing')).toBeNull();
  });

  it('does not fabricate identity after storage failure', async () => {
    const failure = new Error('storage unavailable');
    findUnique.mockRejectedValue(failure);
    await expect(reader.findUsername('subject-1')).rejects.toBe(failure);
  });
});
