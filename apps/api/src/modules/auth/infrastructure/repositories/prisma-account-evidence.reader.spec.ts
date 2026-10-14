/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: D4.2 Boundary Verification
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-account-evidence.reader.spec.ts
 *
 * 🎯 Purpose:
 * Pins minimal evidence, owner command sequencing and fail-closed composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService } from '@api/core/database';
import { PrismaAccountEvidenceReader } from './prisma-account-evidence.reader';
describe('PrismaAccountEvidenceReader', () => {
  const findUnique = jest.fn();
  const reader = new PrismaAccountEvidenceReader({
    user: { findUnique },
  } as unknown as PrismaService);
  const createdAt = new Date('2020-01-01');
  beforeEach(() => jest.resetAllMocks());
  it.each(['ACTIVE', 'BANNED', 'DEACTIVATED', 'DELETED'])(
    'selects minimal evidence for %s without returning secrets',
    async (status) => {
      findUnique.mockResolvedValue({
        status,
        createdAt,
        passwordHash: 'private',
        email: 'private@example.test',
      });
      expect(await reader.find('subject')).toEqual({
        active: status === 'ACTIVE',
        createdAt,
      });
      expect(findUnique.mock.calls).toEqual([
        [
          {
            where: { id: 'subject' },
            select: { status: true, createdAt: true },
          },
        ],
      ]);
    },
  );
  it('returns null for a missing account', async () => {
    findUnique.mockResolvedValue(null);
    expect(await reader.find('missing')).toBeNull();
  });
  it('does not manufacture eligibility after storage failure', async () => {
    findUnique.mockRejectedValue(new Error('storage failed'));
    await expect(reader.find('subject')).rejects.toThrow('storage failed');
  });
});
