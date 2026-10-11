/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/infrastructure/repositories/prisma-users.repository.spec.ts
 *
 * 🎯 Purpose:
 * Verifies Members Directory filtering and deterministic sorting at the
 * Prisma repository boundary. Registration is tested in identity composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UserStatus } from '@prisma/client';

import type { PrismaService } from '@api/core/database';

import { PrismaUsersRepository } from './prisma-users.repository';

describe('PrismaUsersRepository', () => {
  it('limits public identity lookups to active accounts', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const findFirst = jest.fn().mockResolvedValue(null);
    const repository = new PrismaUsersRepository({
      user: { findMany, findFirst },
    } as unknown as PrismaService);

    await repository.findManyByIds(['user-1']);
    await repository.findPublicById('user-1');
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
          id: 'user-1',
          status: 'ACTIVE',
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
});
