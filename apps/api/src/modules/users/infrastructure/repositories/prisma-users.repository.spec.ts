/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-users.repository.spec.ts
 *
 * 🎯 Purpose:
 * Verifies Members Directory filtering and deterministic sorting at the
 * Prisma repository boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UserStatus } from '@prisma/client';

import type { PrismaService } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';

import { PrismaUsersRepository } from './prisma-users.repository';

describe('PrismaUsersRepository', () => {
  const audit = {
    append: jest.fn(),
  } as unknown as AuditWriterService;

  it('limits public identity lookups to active accounts', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const findFirst = jest.fn().mockResolvedValue(null);
    const repository = new PrismaUsersRepository(
      {
        user: { findMany, findFirst },
      } as unknown as PrismaService,
      audit,
    );

    await repository.findManyByIds(['user-1']);
    await repository.findPublicByUsername('astro');

    expect(findMany.mock.calls).toContainEqual([
      {
        where: {
          status: 'ACTIVE',
          id: { in: ['user-1'] },
        },
      },
    ]);
    expect(findFirst.mock.calls).toContainEqual([
      {
        where: {
          username: 'astro',
          status: 'ACTIVE',
        },
      },
    ]);
  });

  it('applies active-member search and deterministic last-active sorting', async () => {
    const user = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    const prisma = {
      user,
      $transaction: jest.fn(
        (operations: [Promise<unknown>, Promise<unknown>]) =>
          Promise.all(operations),
      ),
    } as unknown as PrismaService;
    const repository = new PrismaUsersRepository(prisma, audit);

    await repository.findMany({
      pagination: { page: 2, limit: 10 },
      search: '  astro  ',
      status: UserStatus.ACTIVE,
      sort: 'LAST_ACTIVE',
      userIds: ['user-1'],
      role: 'MODERATOR',
    });

    expect(user.findMany).toHaveBeenCalledWith({
      where: {
        status: UserStatus.ACTIVE,
        id: { in: ['user-1'] },
        roles: {
          some: {
            role: {
              name: { equals: 'MODERATOR', mode: 'insensitive' },
            },
          },
        },
        OR: [
          { username: { contains: 'astro', mode: 'insensitive' } },
          { displayName: { contains: 'astro', mode: 'insensitive' } },
        ],
      },
      skip: 10,
      take: 10,
      orderBy: [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
    });
    expect(user.count).toHaveBeenCalledWith({
      where: {
        status: UserStatus.ACTIVE,
        id: { in: ['user-1'] },
        roles: {
          some: {
            role: {
              name: { equals: 'MODERATOR', mode: 'insensitive' },
            },
          },
        },
        OR: [
          { username: { contains: 'astro', mode: 'insensitive' } },
          { displayName: { contains: 'astro', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('creates an account and assigns the default user role atomically', async () => {
    const createdUser = { id: 'user-1' };
    const transaction = {
      role: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'role-user' }),
      },
      user: {
        create: jest.fn().mockResolvedValue(createdUser),
      },
      userRole: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        (operation: (client: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    } as unknown as PrismaService;
    const repository = new PrismaUsersRepository(prisma, audit);

    const result = await repository.create({
      email: 'user@dss.test',
      username: 'user',
      passwordHash: 'hash',
    });

    expect(result).toBe(createdUser);
    expect(transaction.role.findUniqueOrThrow.mock.calls).toContainEqual([
      {
        where: { name: 'user' },
        select: { id: true },
      },
    ]);
    expect(transaction.userRole.create.mock.calls).toContainEqual([
      {
        data: {
          userId: 'user-1',
          roleId: 'role-user',
        },
      },
    ]);
  });

  it('atomically deactivates the account, revokes sessions and appends audit', async () => {
    const deactivated = { id: 'user-1', status: UserStatus.DEACTIVATED };
    const transaction = {
      user: { update: jest.fn().mockResolvedValue(deactivated) },
      session: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    const prisma = {
      $transaction: jest.fn(
        (operation: (client: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    } as unknown as PrismaService;
    const append = jest.fn().mockResolvedValue('audit-1');
    const repository = new PrismaUsersRepository(prisma, {
      append,
    } as unknown as AuditWriterService);

    await expect(repository.deactivateAccount('user-1')).resolves.toBe(
      deactivated,
    );
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        status: 'DEACTIVATED',
        deactivatedAt: expect.any(Date) as Date,
        refreshTokenHash: null,
      },
    });
    expect(transaction.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) as Date },
    });
    expect(append).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        action: 'user.account.deactivated',
      }) as object,
    );
  });
});
