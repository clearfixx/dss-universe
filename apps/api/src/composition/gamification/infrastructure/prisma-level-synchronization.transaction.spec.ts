/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Levels Synchronization Composition Verification
 * 📄 File: apps/api/src/composition/gamification/infrastructure/prisma-level-synchronization.transaction.spec.ts
 * 🎯 Purpose: Verifies lock-before-read sequencing and unmasked owner failures.
 * 🧠 Responsibilities: Checks one default transaction and exact scoped operation arguments.
 * 🏗️ Architecture: Unit composition evidence; real DB tests prove rollback and contention.
 * ⚠️ Important: These doubles are not proof of PostgreSQL isolation or authorization.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService, TransactionClient } from '@api/core/database';
import type {
  LevelSynchronizationEvent,
  LevelTargetDerivation,
} from '@api/modules/levels';
import type { PrismaLevelSynchronizationWriter } from '@api/modules/levels/infrastructure';
import type { PrismaTransactionalPointsBalanceReader } from '@api/modules/community-points/infrastructure';
import { PrismaLevelSynchronizationTransaction } from './prisma-level-synchronization.transaction';

describe('PrismaLevelSynchronizationTransaction', () => {
  const event: LevelSynchronizationEvent = {
    eventId: 'synthetic-event',
    eventName: 'community-points.awarded.v1',
    eventVersion: 1,
    userId: 'subject',
    occurredAt: new Date('2026-11-15T00:00:00Z'),
  };
  const definitions = [
    { level: 1, threshold: 10, updatedAt: event.occurredAt, updatedById: null },
  ];
  const result = { duplicate: false, transitions: [] };
  const transaction = {} as TransactionClient;
  let order: string[];
  const database = { $transaction: jest.fn() };
  const writer = {
    lockUser: jest.fn<
      ReturnType<PrismaLevelSynchronizationWriter['lockUser']>,
      Parameters<PrismaLevelSynchronizationWriter['lockUser']>
    >(),
    definitions: jest.fn<
      ReturnType<PrismaLevelSynchronizationWriter['definitions']>,
      Parameters<PrismaLevelSynchronizationWriter['definitions']>
    >(),
    apply: jest.fn<
      ReturnType<PrismaLevelSynchronizationWriter['apply']>,
      Parameters<PrismaLevelSynchronizationWriter['apply']>
    >(),
  };
  const points = {
    balance: jest.fn<
      ReturnType<PrismaTransactionalPointsBalanceReader['balance']>,
      Parameters<PrismaTransactionalPointsBalanceReader['balance']>
    >(),
  };
  const derive = jest.fn<
    ReturnType<LevelTargetDerivation>,
    Parameters<LevelTargetDerivation>
  >();
  const subject = new PrismaLevelSynchronizationTransaction(
    database as unknown as PrismaService,
    writer as unknown as PrismaLevelSynchronizationWriter,
    points,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    order = [];
    database.$transaction.mockImplementation(
      (action: (tx: TransactionClient) => Promise<unknown>) =>
        action(transaction),
    );
    writer.lockUser.mockImplementation(() => {
      order.push('lock');
      return Promise.resolve(1);
    });
    points.balance.mockImplementation(() => {
      order.push('balance');
      return Promise.resolve(50);
    });
    writer.definitions.mockImplementation(() => {
      order.push('definitions');
      return Promise.resolve(definitions);
    });
    derive.mockImplementation(() => {
      order.push('derive');
      return 1;
    });
    writer.apply.mockImplementation(() => {
      order.push('apply');
      return Promise.resolve(result);
    });
  });

  it('holds the owned lock before scoped reads, derivation and writes in one default transaction', async () => {
    await expect(subject.sync(event, derive)).resolves.toBe(result);
    expect(order).toEqual([
      'lock',
      'balance',
      'definitions',
      'derive',
      'apply',
    ]);
    expect(database.$transaction.mock.calls).toHaveLength(1);
    expect(database.$transaction.mock.calls[0]).toHaveLength(1);
    expect(writer.lockUser).toHaveBeenCalledWith(transaction, event.userId);
    expect(points.balance).toHaveBeenCalledWith(transaction, event.userId);
    expect(writer.definitions).toHaveBeenCalledWith(transaction);
    expect(derive).toHaveBeenCalledWith(50, definitions);
    expect(writer.apply).toHaveBeenCalledWith(transaction, event, 1, 50);
  });

  it('does not read facts when locking fails', async () => {
    const error = new Error('synthetic lock failure');
    writer.lockUser.mockRejectedValueOnce(error);
    await expect(subject.sync(event, derive)).rejects.toBe(error);
    expect(points.balance).not.toHaveBeenCalled();
    expect(writer.definitions).not.toHaveBeenCalled();
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('does not derive or write when the owner balance read fails', async () => {
    const error = new Error('synthetic balance failure');
    points.balance.mockRejectedValueOnce(error);
    await expect(subject.sync(event, derive)).rejects.toBe(error);
    expect(derive).not.toHaveBeenCalled();
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('preserves pure policy failure without starting owned writes', async () => {
    const error = new Error('synthetic derivation failure');
    derive.mockImplementationOnce(() => {
      throw error;
    });
    await expect(subject.sync(event, derive)).rejects.toBe(error);
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('preserves the owned writer failure identity', async () => {
    const error = new Error('synthetic owned write failure');
    writer.apply.mockRejectedValueOnce(error);
    await expect(subject.sync(event, derive)).rejects.toBe(error);
  });
});
