/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Asset Composition Tests
 * 📄 File: apps/api/src/composition/profile-assets/infrastructure/prisma-profile-asset.transaction.spec.ts
 *
 * 🎯 Purpose:
 * Pins guard-first assignment ordering and the unchanged conflict/transaction contract.
 *
 * 🧠 Responsibilities:
 * • runs the actual Media-owned guard with mocked database IO only;
 * • prevents reference/profile/Audit writes after a failed guard;
 * • keeps removals independent from the new assignment guard.
 *
 * 🏗️ Architecture:
 * Root unit tests; actual rollback and competing HTTP outcomes are migrated E2E.
 *
 * ⚠️ Important:
 * These IO mocks do not prove transaction rollback or live eligibility.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ConflictException } from '@nestjs/common';
import type { PrismaService, TransactionClient } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';
import type { ProfileAssetSlot } from '@api/modules/media';
import { PrismaProfileAssetTransaction } from './prisma-profile-asset.transaction';

describe('Profile asset write ordering', () => {
  let calls: string[];
  const observe = (name: string, result: unknown = undefined) =>
    jest.fn().mockImplementation(() => {
      calls.push(name);
      return Promise.resolve(result);
    });
  function setup(rows: { id: string }[] = [{ id: 'media' }]) {
    calls = [];
    const tx = {
      $queryRaw: observe('guard', rows),
      mediaReference: {
        updateMany: observe('retire'),
        create: observe('reference'),
      },
      user: { update: observe('profile') },
    };
    const append = observe('audit');
    const transact = jest.fn(
      (run: (client: TransactionClient) => Promise<void>) =>
        run(tx as unknown as TransactionClient),
    );
    const root = new PrismaProfileAssetTransaction(
      { $transaction: transact } as unknown as PrismaService,
      { append } as unknown as AuditWriterService,
    );
    return { root, tx, append, transact };
  }
  const input = (slot: ProfileAssetSlot) => ({
    slot,
    subjectId: 'subject',
    actorId: 'actor',
    mediaId: 'media',
    url: '/synthetic',
  });

  it.each(['AVATAR', 'COVER'] as const)(
    'guards before %s reference/profile/Audit writes in one default transaction',
    async (slot) => {
      const { root, transact, tx, append } = setup();
      await root.assign(input(slot));
      expect(calls).toEqual([
        'guard',
        'retire',
        'reference',
        'profile',
        'audit',
      ]);
      expect(transact).toHaveBeenCalledWith(expect.any(Function));
      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'subject' },
        data:
          slot === 'AVATAR'
            ? { avatarMediaId: 'media', avatarUrl: '/synthetic' }
            : { coverMediaId: 'media', coverUrl: '/synthetic' },
      });
      expect(append).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action:
            slot === 'AVATAR' ? 'user.avatar.assigned' : 'user.cover.assigned',
          actorId: 'actor',
          targetId: 'subject',
        }),
      );
    },
  );
  it.each(['AVATAR', 'COVER'] as const)(
    'preserves %s conflicts without retiring existing references',
    async (slot) => {
      const { root, tx, append } = setup([]);
      await expect(root.assign(input(slot))).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(root.assign(input(slot))).rejects.toThrow(
        `${slot === 'AVATAR' ? 'Avatar' : 'Cover'} media changed before it could be assigned.`,
      );
      expect(calls).toEqual(['guard', 'guard']);
      expect(tx.mediaReference.updateMany).not.toHaveBeenCalled();
      expect(tx.user.update).not.toHaveBeenCalled();
      expect(append).not.toHaveBeenCalled();
    },
  );
  it.each(['AVATAR', 'COVER'] as const)(
    'retains %s removal without creating a guard write',
    async (slot) => {
      const { root } = setup();
      await root.remove(slot, 'subject', 'actor');
      expect(calls).toEqual(['retire', 'profile', 'audit']);
    },
  );
  it('propagates a guard database error before any other write', async () => {
    const { root, tx } = setup();
    const failure = new Error('synthetic guard failure');
    tx.$queryRaw.mockRejectedValueOnce(failure);
    await expect(root.assign(input('AVATAR'))).rejects.toBe(failure);
    expect(tx.mediaReference.updateMany).not.toHaveBeenCalled();
  });
  it('rejects an unknown slot before opening a transaction', async () => {
    const { root, transact } = setup();
    await expect(
      root.assign(input('UNKNOWN' as ProfileAssetSlot)),
    ).rejects.toThrow('Unknown profile asset slot.');
    expect(transact).not.toHaveBeenCalled();
  });
});
