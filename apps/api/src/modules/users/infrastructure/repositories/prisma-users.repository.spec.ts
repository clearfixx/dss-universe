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
    });

    expect(user.findMany).toHaveBeenCalledWith({
      where: {
        status: UserStatus.ACTIVE,
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
        OR: [
          { username: { contains: 'astro', mode: 'insensitive' } },
          { displayName: { contains: 'astro', mode: 'insensitive' } },
        ],
      },
    });
  });
});
