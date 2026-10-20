/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Tests
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-media-profile-boundary.spec.ts
 *
 * 🎯 Purpose:
 * Characterizes the existing query boundary before moving profile predicates.
 *
 * 🧠 Responsibilities:
 * • preserves orphan filters and independent metrics reads;
 * • checks cleanup revalidation, isolation and audit ordering.
 *
 * 🏗️ Architecture:
 * Real repository/root/owner composition with mocked delegates, not PostgreSQL evidence.
 *
 * ⚠️ Important:
 * Does not prove concurrent attachment safety or database rollback semantics.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';
import { PrismaMediaRepository } from './prisma-media.repository';
import { PrismaProfileAwareMediaLibrary } from '@api/composition/media-library/infrastructure/prisma-profile-aware-media-library';

describe('Media profile predicate characterization', () => {
  const findMany = jest.fn();
  const updateMany = jest.fn();
  const aggregate = jest.fn();
  const variantAggregate = jest.fn();
  const count = jest.fn();
  const append = jest.fn();
  const transaction = { media: { findMany, updateMany } };
  const transact = jest.fn(
    (run: (tx: typeof transaction) => unknown, options?: unknown) => {
      expect(options).toEqual({ isolationLevel: 'Serializable' });
      return run(transaction);
    },
  );
  const prisma = {
    media: { findMany, aggregate, count },
    mediaVariant: { aggregate: variantAggregate },
    $transaction: transact,
  } as unknown as PrismaService;
  const audit = { append } as unknown as AuditWriterService;
  const repository = new PrismaMediaRepository(
    prisma,
    audit,
    new PrismaProfileAwareMediaLibrary(prisma, audit),
  );
  const absentBindings = {
    references: { none: { removedAt: null } },
    avatarFor: null,
    coverFor: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([]);
    append.mockResolvedValue(undefined);
  });

  it('adds profile absence only for orphan browse and preserves cursor ordering', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    await expect(
      repository.browseLibrary({
        first: 2,
        orphaned: true,
        cursor: { createdAt, id: 'm' },
      }),
    ).resolves.toEqual({ items: [], hasNextPage: false });
    expect(findMany).toHaveBeenLastCalledWith({
      where: {
        ...absentBindings,
        AND: [
          {
            OR: [
              { createdAt: { lt: createdAt } },
              { createdAt, id: { lt: 'm' } },
            ],
          },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 3,
    });
    await repository.browseLibrary({ first: 2 });
    expect(findMany).toHaveBeenLastCalledWith({
      where: {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 3,
    });
  });

  it('keeps five independent metrics reads and null byte sums', async () => {
    aggregate.mockResolvedValue({ _count: { _all: 8 }, _sum: { size: null } });
    variantAggregate.mockResolvedValue({ _sum: { size: null } });
    count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    await expect(repository.getLibraryMetrics()).resolves.toEqual({
      totalMedia: 8,
      originalBytes: 0,
      variantBytes: 0,
      totalBytes: 0,
      orphanedMedia: 3,
      failedMedia: 2,
      quarantinedMedia: 1,
    });
    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(variantAggregate).toHaveBeenCalledTimes(1);
    expect(count.mock.calls).toEqual([
      [{ where: { status: { not: 'DELETED' }, ...absentBindings } }],
      [{ where: { status: 'FAILED' } }],
      [{ where: { status: 'QUARANTINED' } }],
    ]);
    expect(transact).not.toHaveBeenCalled();
  });

  it('rechecks both bindings before claim and never audits an unclaimed candidate', async () => {
    const olderThan = new Date('2026-01-01T00:00:00Z');
    findMany.mockResolvedValue([
      { id: 'lost', storageKey: 'lost', metadata: null, variants: [] },
      {
        id: 'won',
        storageKey: 'original',
        metadata: null,
        variants: [{ storageKey: 'variant' }],
      },
    ]);
    updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    await expect(
      repository.claimCleanupCandidates(olderThan, 5),
    ).resolves.toEqual([
      { mediaId: 'won', storageKeys: ['original', 'variant'] },
    ]);
    expect(transact.mock.calls[0]?.[1]).toEqual({
      isolationLevel: 'Serializable',
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            status: { in: ['READY', 'FAILED', 'REJECTED'] },
            createdAt: { lt: olderThan },
          },
          { status: 'DELETING' },
        ],
        ...absentBindings,
      },
      include: { variants: { select: { storageKey: true } } },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });
    for (const id of ['lost', 'won']) {
      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id,
          status: { in: ['READY', 'FAILED', 'REJECTED', 'DELETING'] },
          ...absentBindings,
        },
        data: { status: 'DELETING' },
      });
    }
    expect(append).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith(transaction, {
      action: 'media.cleanup.claimed',
      actorType: 'SYSTEM',
      targetType: 'Media',
      targetId: 'won',
    });
  });
});
