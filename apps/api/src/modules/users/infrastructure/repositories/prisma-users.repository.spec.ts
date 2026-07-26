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

import { PrismaUsersRepository } from './prisma-users.repository';

describe('PrismaUsersRepository', () => {
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
    const repository = new PrismaUsersRepository(prisma);

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
    const repository = new PrismaUsersRepository(prisma);

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
});
