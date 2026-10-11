/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-account-credentials.repository.spec.ts
 *
 * 🎯 Purpose:
 * Verifies guarded credential writes, invalidation and transaction failure propagation.
 *
 * 🧠 Responsibilities:
 * • characterizes account-state and credential transition persistence;
 * • checks minimal selection, audit allowlisting and stop-on-failure behavior.
 *
 * 🏗️ Architecture:
 * Adapter unit tests. Real database rollback is verified by API E2E.
 *
 * ⚠️ Important:
 * Mocked transactions do not prove rollback or concurrency behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { AuditWriterService } from '@api/core/audit';
import type { PrismaService } from '@api/core/database';

import { PrismaAccountCredentialsRepository } from './prisma-account-credentials.repository';

describe('PrismaAccountCredentialsRepository', () => {
  const transaction = {
    user: { update: jest.fn<Promise<{ id: string }>, [unknown]>() },
    session: { updateMany: jest.fn() },
  };
  const append = jest.fn();
  const runTransaction = jest.fn(
    (operation: (tx: typeof transaction) => Promise<void>) =>
      operation(transaction),
  );
  const repository = new PrismaAccountCredentialsRepository(
    { $transaction: runTransaction } as unknown as PrismaService,
    { append } as unknown as AuditWriterService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    runTransaction.mockImplementation((operation) => operation(transaction));
    transaction.user.update.mockResolvedValue({ id: 'subject-1' });
    transaction.session.updateMany.mockResolvedValue({ count: 2 });
    append.mockResolvedValue('audit-1');
  });

  it('deactivates only an active subject and revokes sessions before audit', async () => {
    await expect(
      repository.deactivateAccount('subject-1'),
    ).resolves.toBeUndefined();
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'subject-1', status: 'ACTIVE' },
      data: {
        status: 'DEACTIVATED',
        deactivatedAt: expect.any(Date) as Date,
        refreshTokenHash: null,
      },
      select: { id: true },
    });
    const call = transaction.user.update.mock.calls[0][0] as {
      data: { deactivatedAt: Date };
    };
    expect(transaction.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 'subject-1', revokedAt: null },
      data: { revokedAt: call.data.deactivatedAt },
    });
    expect(append).toHaveBeenCalledWith(transaction, {
      action: 'user.account.deactivated',
      actorType: 'USER',
      actorId: 'subject-1',
      targetType: 'User',
      targetId: 'subject-1',
    });
    expect(
      transaction.session.updateMany.mock.invocationCallOrder[0],
    ).toBeLessThan(append.mock.invocationCallOrder[0]);
  });

  it('reactivates only a deactivated subject without restoring revoked sessions', async () => {
    await expect(
      repository.reactivateAccount('subject-1'),
    ).resolves.toBeUndefined();
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'subject-1', status: 'DEACTIVATED' },
      data: { status: 'ACTIVE', deactivatedAt: null, refreshTokenHash: null },
      select: { id: true },
    });
    expect(transaction.session.updateMany).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(transaction, {
      action: 'user.account.reactivated',
      actorType: 'USER',
      actorId: 'subject-1',
      targetType: 'User',
      targetId: 'subject-1',
    });
  });

  it.each([
    ['email', 'user.account.email_changed'],
    ['password', 'user.account.password_changed'],
  ] as const)(
    'invalidates sessions and increments version for %s changes',
    async (kind, action) => {
      const data =
        kind === 'email'
          ? { email: 'next@dss.test', emailVerifiedAt: null }
          : { passwordHash: 'private-hash' };
      await (kind === 'email'
        ? repository.changeEmail('subject-1', 'next@dss.test')
        : repository.changePasswordHash('subject-1', 'private-hash'));
      expect(transaction.user.update).toHaveBeenCalledWith({
        where: { id: 'subject-1', status: 'ACTIVE' },
        data: {
          ...data,
          authVersion: { increment: 1 },
          refreshTokenHash: null,
        },
        select: { id: true },
      });
      expect(transaction.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'subject-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) as Date },
      });
      expect(append).toHaveBeenCalledWith(transaction, {
        action,
        actorType: 'USER',
        actorId: 'subject-1',
        targetType: 'User',
        targetId: 'subject-1',
      });
    },
  );

  it('does not revoke or audit when authoritative state rejects the write', async () => {
    const error = new Error('state changed');
    transaction.user.update.mockRejectedValue(error);
    await expect(repository.deactivateAccount('subject-1')).rejects.toBe(error);
    expect(transaction.session.updateMany).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
  });

  it('does not audit a failed session revocation', async () => {
    const error = new Error('revocation failed');
    transaction.session.updateMany.mockRejectedValue(error);
    await expect(
      repository.changeEmail('subject-1', 'next@dss.test'),
    ).rejects.toBe(error);
    expect(append).not.toHaveBeenCalled();
  });

  it('propagates audit failure through the enclosing transaction', async () => {
    const error = new Error('audit unavailable');
    append.mockRejectedValue(error);
    await expect(
      repository.changePasswordHash('subject-1', 'private-hash'),
    ).rejects.toBe(error);
  });
});
