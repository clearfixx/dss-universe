/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Boundary Verification
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-profile-existence.reader.spec.ts
 *
 * 🎯 Purpose:
 * Pins minimal projections, private module providers and unchanged failure behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService } from '@api/core/database';
import { PrismaProfileExistenceReader } from './prisma-profile-existence.reader';
describe('PrismaProfileExistenceReader', () => {
  const findUnique = jest.fn<Promise<{ id: string } | null>, [unknown]>();
  const reader = new PrismaProfileExistenceReader({
    user: { findUnique },
  } as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());
  it('selects ID only and returns a boolean even if a driver row has extra private fields', async () => {
    findUnique.mockResolvedValue({ id: 'subject', passwordHash: 'private' } as {
      id: string;
    });
    expect(await reader.exists('subject')).toBe(true);
    expect(findUnique.mock.calls).toEqual([
      [{ where: { id: 'subject' }, select: { id: true } }],
    ]);
  });
  it('preserves missing-profile semantics', async () => {
    findUnique.mockResolvedValue(null);
    expect(await reader.exists('missing')).toBe(false);
  });
  it('never manufactures existence after storage failure', async () => {
    const failure = new Error('storage unavailable');
    findUnique.mockRejectedValue(failure);
    await expect(reader.exists('subject')).rejects.toBe(failure);
  });
});
