/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/infrastructure/prisma-registration-transaction.spec.ts
 *
 * 🎯 Purpose:
 * Verifies narrow registration calls; companion PostgreSQL integration tests prove rollback.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService } from '@api/core/database';
import { PrismaRegistrationTransaction } from './prisma-registration-transaction';

describe('PrismaRegistrationTransaction', () => {
  const transaction = {
    role: { findUniqueOrThrow: jest.fn() },
    user: { create: jest.fn() },
    userRole: { create: jest.fn() },
  };
  const runTransaction = jest.fn(
    (operation: (client: typeof transaction) => Promise<string>) =>
      operation(transaction),
  );
  const registration = new PrismaRegistrationTransaction({
    $transaction: runTransaction,
  } as unknown as PrismaService);
  beforeEach(() => {
    jest.clearAllMocks();
    transaction.role.findUniqueOrThrow.mockResolvedValue({ id: 'role' });
    transaction.user.create.mockResolvedValue({ id: 'subject' });
    transaction.userRole.create.mockResolvedValue({});
  });

  it('copies only bound profile and credentials, assigns IAM baseline and returns only ID', async () => {
    const profile = {
      username: 'pilot',
      displayName: 'Pilot',
      roleId: 'admin',
    };
    const store = registration.forProfile(profile);
    profile.username = 'mutated';
    await expect(
      store.create({ email: 'pilot@dss.test', passwordHash: 'hash' }),
    ).resolves.toBe('subject');
    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(transaction.role.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { name: 'user' },
      select: { id: true },
    });
    expect(transaction.user.create).toHaveBeenCalledWith({
      data: {
        email: 'pilot@dss.test',
        passwordHash: 'hash',
        username: 'pilot',
        displayName: 'Pilot',
      },
      select: { id: true },
    });
    expect(transaction.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'subject', roleId: 'role' },
    });
  });

  it('fails before creating a subject when IAM baseline is missing', async () => {
    const error = new Error('baseline missing');
    transaction.role.findUniqueOrThrow.mockRejectedValueOnce(error);
    await expect(
      registration
        .forProfile({ username: 'pilot' })
        .create({ email: 'pilot@dss.test', passwordHash: 'hash' }),
    ).rejects.toBe(error);
    expect(transaction.user.create).not.toHaveBeenCalled();
  });

  it('propagates assignment failure so the real database transaction can roll back', async () => {
    const error = new Error('assignment failed');
    transaction.userRole.create.mockRejectedValueOnce(error);
    await expect(
      registration
        .forProfile({ username: 'pilot' })
        .create({ email: 'pilot@dss.test', passwordHash: 'hash' }),
    ).rejects.toBe(error);
  });
});
