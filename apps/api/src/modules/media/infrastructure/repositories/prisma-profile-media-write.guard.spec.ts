/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Persistence Tests
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/prisma-profile-media-write.guard.spec.ts
 *
 * 🎯 Purpose:
 * Pins the parameterized, metadata-preserving write guard's narrow result contract.
 *
 * 🧠 Responsibilities:
 * • binds opaque IDs separately from SQL text;
 * • rejects non-singleton outcomes without exposing records;
 * • preserves database errors and forbids timestamp writes.
 *
 * 🏗️ Architecture:
 * Unit SQL-shape checks; migrated regressions verify actual predicates and concurrency.
 *
 * ⚠️ Important:
 * Mocked execution is not evidence for database isolation or rollback.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Prisma } from '@prisma/client';
import type { TransactionClient } from '@api/core/database';
import { guardReadyPublicProfileMediaForAssignment } from './prisma-profile-media-write.guard';

describe('Media profile assignment write guard', () => {
  const query = jest.fn<Promise<{ id: string }[]>, [Prisma.Sql]>();
  const tx = { $queryRaw: query } as unknown as TransactionClient;
  beforeEach(() => jest.resetAllMocks());
  it('binds opaque IDs as values and writes only status=status, not timestamps', async () => {
    const mediaId = `synthetic' OR true --`;
    const ownerId = `opaque' AND false --`;
    query.mockResolvedValueOnce([{ id: mediaId }]);
    await expect(
      guardReadyPublicProfileMediaForAssignment(tx, mediaId, ownerId),
    ).resolves.toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
    const sql = query.mock.calls[0][0];
    expect(sql.values).toEqual([mediaId, ownerId]);
    expect(sql.text).toMatch(/UPDATE "media" SET "status" = "status"/);
    expect(sql.text).toContain('"id" = $1 AND "ownerId" = $2');
    expect(sql.text).toContain(
      `"status" = 'READY' AND "visibility" = 'PUBLIC'`,
    );
    expect(sql.text).not.toMatch(/updatedAt|createdAt|FOR UPDATE/);
    expect(sql.text).not.toContain(mediaId);
    expect(sql.text).not.toContain(ownerId);
  });
  it.each([
    { rows: [] },
    { rows: [{ id: 'one' }, { id: 'impossible-duplicate' }] },
  ])('fails closed for a non-singleton result $rows', async ({ rows }) => {
    query.mockResolvedValueOnce(rows);
    await expect(
      guardReadyPublicProfileMediaForAssignment(tx, 'media', 'subject'),
    ).resolves.toBe(false);
  });
  it('does not swallow database errors', async () => {
    const failure = new Error('synthetic write failure');
    query.mockRejectedValueOnce(failure);
    await expect(
      guardReadyPublicProfileMediaForAssignment(tx, 'media', 'subject'),
    ).rejects.toBe(failure);
  });
});
