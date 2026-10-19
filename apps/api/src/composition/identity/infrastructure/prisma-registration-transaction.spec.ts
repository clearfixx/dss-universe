/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/infrastructure/prisma-registration-transaction.spec.ts
 *
 * 🎯 Purpose:
 * Verifies narrow registration calls; companion PostgreSQL integration tests prove rollback.
 * Pins input allowlists, query ordering and pre-assignment failures before ownership transfer.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService } from '@api/core/database';
import { PrismaRegistrationRoleWriter } from '@api/modules/iam/infrastructure';
import { credentialEnrollmentData } from '@api/modules/auth/infrastructure';
import { registrationProfileData } from '@api/modules/users/infrastructure';
import { PrismaRegistrationTransaction } from './prisma-registration-transaction';

describe('PrismaRegistrationTransaction', () => {
  it('keeps credential and profile enrollment fragments disjoint and detached', () => {
    const input = {
      email: 'pilot@dss.test',
      passwordHash: 'synthetic-hash',
      username: 'pilot',
      displayName: 'Pilot',
      status: 'ACTIVE',
      roleId: 'forged-role',
    };
    const credentials = credentialEnrollmentData(input);
    const profile = registrationProfileData(input);
    input.email = 'changed@dss.test';
    input.username = 'changed';
    expect(credentials).toEqual({
      email: 'pilot@dss.test',
      passwordHash: 'synthetic-hash',
    });
    expect(profile).toEqual({ username: 'pilot', displayName: 'Pilot' });
    expect(registrationProfileData({ username: 'pilot' })).toEqual({
      username: 'pilot',
      displayName: undefined,
    });
  });
  const transaction = {
    role: { findUniqueOrThrow: jest.fn() },
    user: { create: jest.fn() },
    userRole: { create: jest.fn() },
  };
  const runTransaction = jest.fn(
    (operation: (client: typeof transaction) => Promise<string>) =>
      operation(transaction),
  );
  const registration = new PrismaRegistrationTransaction(
    { $transaction: runTransaction } as unknown as PrismaService,
    new PrismaRegistrationRoleWriter(),
  );
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
    profile.displayName = 'Mutated';
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

  it('ignores overbroad credential fields instead of overriding bound profile or IAM authority', async () => {
    const store = registration.forProfile({ username: 'bound-pilot' });
    const credentials = {
      email: 'pilot@dss.test',
      passwordHash: 'synthetic-hash',
      username: 'forged-pilot',
      displayName: 'Forged',
      status: 'BANNED',
      authVersion: 999,
      roleId: 'forged-admin',
      roles: { create: [{ roleId: 'forged-admin' }] },
    };
    await expect(store.create(credentials)).resolves.toBe('subject');
    expect(transaction.user.create).toHaveBeenCalledWith({
      data: {
        email: credentials.email,
        passwordHash: credentials.passwordHash,
        username: 'bound-pilot',
        displayName: undefined,
      },
      select: { id: true },
    });
    expect(transaction.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'subject', roleId: 'role' },
    });
  });

  it('keeps role lookup before subject insert before assignment in one transaction without options', async () => {
    await registration
      .forProfile({ username: 'pilot' })
      .create({ email: 'pilot@dss.test', passwordHash: 'synthetic-hash' });
    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(runTransaction.mock.calls[0]).toHaveLength(1);
    expect(
      transaction.role.findUniqueOrThrow.mock.invocationCallOrder[0],
    ).toBeLessThan(transaction.user.create.mock.invocationCallOrder[0]);
    expect(transaction.user.create.mock.invocationCallOrder[0]).toBeLessThan(
      transaction.userRole.create.mock.invocationCallOrder[0],
    );
  });

  it('propagates subject insert failure without attempting a role assignment', async () => {
    const error = new Error('subject insert failed');
    transaction.user.create.mockRejectedValueOnce(error);
    await expect(
      registration
        .forProfile({ username: 'pilot' })
        .create({ email: 'pilot@dss.test', passwordHash: 'synthetic-hash' }),
    ).rejects.toBe(error);
    expect(transaction.role.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    expect(transaction.userRole.create).not.toHaveBeenCalled();
  });
});
