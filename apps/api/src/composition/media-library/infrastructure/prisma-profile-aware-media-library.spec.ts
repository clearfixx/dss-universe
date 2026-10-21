/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Library Composition Tests
 * 📄 File: apps/api/src/composition/media-library/infrastructure/prisma-profile-aware-media-library.spec.ts
 *
 * 🎯 Purpose:
 * Pins whole-batch conflict deferral without hiding unrelated persistence errors.
 *
 * 🧠 Responsibilities:
 * • accepts only the known Prisma write-conflict/deadlock category;
 * • preserves Serializable options and avoids immediate retries;
 * • leaves ordinary claim/Audit delegation unchanged.
 *
 * 🏗️ Architecture:
 * Root adapter unit tests; migrated tests establish actual rollback/SQL behavior.
 *
 * ⚠️ Important:
 * Synthetic conflict objects pin classification; real P2034 is observed separately.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';
import type { PrismaService } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';
import { PrismaProfileAwareMediaLibrary } from './prisma-profile-aware-media-library';

describe('Media cleanup conflict boundary', () => {
  const transact = jest.fn();
  const prisma = { $transaction: transact } as unknown as PrismaService;
  const append = jest.fn();
  const audit = { append } as unknown as AuditWriterService;
  const library = new PrismaProfileAwareMediaLibrary(prisma, audit);
  const cutoff = new Date('2025-01-01');
  beforeEach(() => jest.resetAllMocks());

  function known(code: string) {
    return new Prisma.PrismaClientKnownRequestError(
      'synthetic persistence error',
      {
        code,
        clientVersion: 'test-fixture',
      },
    );
  }
  it('defers only a known P2034, with no retry or partial claim output', async () => {
    transact.mockRejectedValueOnce(known('P2034'));
    await expect(library.claimCleanupCandidates(cutoff, 50)).resolves.toEqual(
      [],
    );
    expect(transact).toHaveBeenCalledTimes(1);
    expect(transact).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
    expect(append).not.toHaveBeenCalled();
  });
  it.each([
    ['another known code', known('P2002')],
    ['transaction timeout', known('P2028')],
    [
      'ordinary error',
      new Error('synthetic P2034 message is not classification'),
    ],
    ['untrusted code-shaped object', { code: 'P2034' }],
    ['unknown thrown value', undefined],
  ])('preserves %s without retry', async (_description, failure) => {
    transact.mockRejectedValueOnce(failure);
    await expect(library.claimCleanupCandidates(cutoff, 50)).rejects.toBe(
      failure,
    );
    expect(transact).toHaveBeenCalledTimes(1);
  });
  it('returns ordinary committed claims and retains the existing owner algorithm', async () => {
    const transaction = {
      media: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'media',
            storageKey: 'original',
            metadata: null,
            variants: [],
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    transact.mockImplementationOnce((run: (tx: unknown) => unknown) =>
      run(transaction),
    );
    await expect(library.claimCleanupCandidates(cutoff, 50)).resolves.toEqual([
      { mediaId: 'media', storageKeys: ['original'] },
    ]);
    expect(append).toHaveBeenCalledWith(transaction, {
      action: 'media.cleanup.claimed',
      actorType: 'SYSTEM',
      targetType: 'Media',
      targetId: 'media',
    });
  });
});
