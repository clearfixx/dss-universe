/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Profile Composition Tests
 * 📄 File: apps/api/src/composition/users-profiles/infrastructure/users-profile-boundaries.spec.ts
 *
 * 🎯 Purpose:
 * Pins owned fragments, safe shared-row assembly and display failure policies.
 *
 * 🧠 Responsibilities:
 * • checks exact field/update allowlists and default batch composition;
 * • checks role selection and copied display maps without permission claims.
 *
 * 🏗️ Architecture:
 * Unit boundary evidence; real migrated E2E certifies persistence/filter behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService } from '@api/core/database';
import {
  usersProfileSelect,
  profileDirectoryQuery,
  profileUpdateData,
} from '@api/modules/users/infrastructure';
import {
  profileAccountSelect,
  profileAccountByEmail,
  activeProfileAccount,
  profileAccountState,
} from '@api/modules/auth/infrastructure';
import { profileDirectoryRole } from '@api/modules/iam/infrastructure';
import { PrismaRoleDisplayReader } from '../../../modules/iam/infrastructure/repositories/prisma-role-display.reader';
import { PrismaUsersProfilePersistence } from './prisma-users-profile.persistence';
import { ProfileRoleNamesAdapter } from './profile-role-names.adapter';

const selectedFields = [
  'id',
  'email',
  'username',
  'displayName',
  'bio',
  'location',
  'website',
  'technologies',
  'interests',
  'avatarUrl',
  'coverUrl',
  'status',
  'emailVerifiedAt',
  'lastSeenAt',
  'createdAt',
  'updatedAt',
].sort();

describe('owned profile query fragments', () => {
  it('keeps thirteen Users fields and three Auth display fields disjoint and frozen', () => {
    expect(Object.keys(usersProfileSelect).sort()).toEqual(
      selectedFields.filter(
        (key) => !['email', 'status', 'emailVerifiedAt'].includes(key),
      ),
    );
    expect(profileAccountSelect).toEqual({
      email: true,
      status: true,
      emailVerifiedAt: true,
    });
    expect(
      Object.values(usersProfileSelect).every((value) => value === true),
    ).toBe(true);
    expect(Object.isFrozen(usersProfileSelect)).toBe(true);
    expect(Object.isFrozen(profileAccountSelect)).toBe(true);
    expect(profileAccountByEmail('pilot@dss.test')).toEqual({
      email: 'pilot@dss.test',
    });
    expect(activeProfileAccount()).toEqual({ status: 'ACTIVE' });
    expect(profileAccountState(undefined)).toEqual({ status: undefined });
    expect(profileAccountState('DELETED')).toEqual({ status: 'DELETED' });
  });
  it.each([
    [undefined, [{ createdAt: 'desc' }, { id: 'asc' }]],
    ['NEWEST', [{ createdAt: 'desc' }, { id: 'asc' }]],
    ['OLDEST', [{ createdAt: 'asc' }, { id: 'asc' }]],
    ['USERNAME_ASC', [{ username: 'asc' }, { id: 'asc' }]],
    ['USERNAME_DESC', [{ username: 'desc' }, { id: 'asc' }]],
    [
      'LAST_ACTIVE',
      [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
    ],
  ] as const)('retains directory order %s', (sort, orderBy) => {
    expect(profileDirectoryQuery({ sort }).orderBy).toEqual(orderBy);
  });
  it('preserves directory defaults, sparse pagination, empty IDs and trimmed search', () => {
    expect(profileDirectoryQuery({})).toMatchObject({
      page: 1,
      limit: 20,
      skip: 0,
      take: 20,
      where: {},
    });
    expect(
      profileDirectoryQuery({ pagination: {}, search: '   ', userIds: [] }),
    ).toMatchObject({ page: 1, limit: 20, where: { id: { in: [] } } });
    expect(
      profileDirectoryQuery({
        pagination: { page: 2, limit: 3 },
        search: ' pilot ',
        userIds: ['subject'],
      }),
    ).toMatchObject({
      page: 2,
      limit: 3,
      skip: 3,
      take: 3,
      where: {
        id: { in: ['subject'] },
        OR: [
          { username: { contains: 'pilot', mode: 'insensitive' } },
          { displayName: { contains: 'pilot', mode: 'insensitive' } },
        ],
      },
    });
  });
  it('copies only ten profile update fields even from an overbroad runtime input', () => {
    const input = {
      username: 'pilot',
      displayName: 'Pilot',
      bio: null,
      location: 'Kyiv',
      website: null,
      technologies: ['TS'],
      interests: [],
      avatarUrl: '/avatar',
      coverUrl: null,
      lastSeenAt: new Date(0),
      passwordHash: 'private',
      email: 'private@dss.test',
      status: 'BANNED',
      roles: { connect: [] },
      avatarMediaId: 'foreign',
      id: 'different',
    };
    const result = profileUpdateData(input);
    expect(result).toEqual(
      Object.fromEntries(
        [
          'username',
          'displayName',
          'bio',
          'location',
          'website',
          'technologies',
          'interests',
          'avatarUrl',
          'coverUrl',
          'lastSeenAt',
        ].map((key) => [key, input[key as keyof typeof input]]),
      ),
    );
    expect(profileUpdateData({})).toEqual(
      Object.fromEntries(Object.keys(result).map((key) => [key, undefined])),
    );
  });
  it('keeps IAM role filtering separate, case-insensitive and optional', () => {
    expect(profileDirectoryRole(undefined)).toEqual({});
    expect(profileDirectoryRole('')).toEqual({});
    expect(profileDirectoryRole('PiLoT')).toEqual({
      roles: {
        some: { role: { name: { equals: 'PiLoT', mode: 'insensitive' } } },
      },
    });
  });
});

describe('PrismaUsersProfilePersistence', () => {
  function setup() {
    const user = {
      findUnique: jest.fn<Promise<unknown>, [unknown]>(),
      findFirst: jest.fn<Promise<unknown>, [unknown]>(),
      findMany: jest.fn<Promise<unknown>, [unknown]>(),
      count: jest.fn<Promise<unknown>, [unknown]>(),
      update: jest.fn<Promise<unknown>, [unknown]>(),
    };
    const transaction = jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
    const store = new PrismaUsersProfilePersistence({
      user,
      $transaction: transaction,
    } as unknown as PrismaService);
    return { user, transaction, store };
  }
  it.each([
    ['findById', 'findUnique', 'subject', { id: 'subject' }],
    [
      'findByEmail',
      'findUnique',
      'pilot@dss.test',
      { email: 'pilot@dss.test' },
    ],
    ['findByUsername', 'findUnique', 'pilot', { username: 'pilot' }],
    [
      'findManyByIds',
      'findMany',
      ['subject'],
      { status: 'ACTIVE', id: { in: ['subject'] } },
    ],
    [
      'findPublicById',
      'findFirst',
      'subject',
      { id: 'subject', status: 'ACTIVE' },
    ],
    [
      'findPublicByUsername',
      'findFirst',
      'pilot',
      { username: 'pilot', status: 'ACTIVE' },
    ],
  ] as const)(
    'assembles %s once without an added transaction',
    async (method, delegate, value, where) => {
      const { user, transaction, store } = setup();
      const result = { synthetic: true };
      user[delegate].mockResolvedValue(result);
      const command = store[method].bind(store) as (
        input: unknown,
      ) => Promise<unknown>;
      await expect(command(value)).resolves.toBe(result);
      const query = user[delegate].mock.calls[0][0] as {
        where: unknown;
        select: Record<string, boolean>;
      };
      expect(query.where).toEqual(where);
      expect(Object.keys(query.select).sort()).toEqual(selectedFields);
      expect(user[delegate]).toHaveBeenCalledTimes(1);
      expect(transaction).not.toHaveBeenCalled();
    },
  );
  it('retains a lazy batch of rows then count with no transaction options', async () => {
    const { user, transaction, store } = setup();
    user.findMany.mockResolvedValue([{ id: 'subject' }]);
    user.count.mockResolvedValue(4);
    const result = await store.findMany({
      pagination: { page: 2, limit: 3 },
      search: ' pilot ',
      role: 'MODERATOR',
      status: 'ACTIVE',
      userIds: ['subject'],
      sort: 'LAST_ACTIVE',
    });
    expect(result).toEqual({
      items: [{ id: 'subject' }],
      total: 4,
      page: 2,
      limit: 3,
      totalPages: 2,
    });
    expect(transaction.mock.calls[0]).toHaveLength(1);
    expect(transaction.mock.calls[0][0]).toHaveLength(2);
    const query = user.findMany.mock.calls[0][0] as {
      where: unknown;
      skip: number;
      take: number;
      orderBy: unknown;
      select: object;
    };
    expect(query).toMatchObject({
      skip: 3,
      take: 3,
      orderBy: [{ lastSeenAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
    });
    expect(query.where).toEqual({
      id: { in: ['subject'] },
      status: 'ACTIVE',
      roles: {
        some: { role: { name: { equals: 'MODERATOR', mode: 'insensitive' } } },
      },
      OR: [
        { username: { contains: 'pilot', mode: 'insensitive' } },
        { displayName: { contains: 'pilot', mode: 'insensitive' } },
      ],
    });
    expect(user.count).toHaveBeenCalledWith({ where: query.where });
    expect(user.findMany.mock.invocationCallOrder[0]).toBeLessThan(
      user.count.mock.invocationCallOrder[0],
    );
    expect(Object.keys(query.select).sort()).toEqual(selectedFields);
  });
  it('keeps empty directory defaults and propagates count failure', async () => {
    const { user, store } = setup();
    user.findMany.mockResolvedValue([]);
    user.count.mockResolvedValue(0);
    await expect(store.findMany()).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    const error = new Error('count failed');
    user.count.mockRejectedValueOnce(error);
    await expect(store.findMany()).rejects.toBe(error);
  });
  it('updates profile fields and returns the same selected result without a follow-up read', async () => {
    const { user, transaction, store } = setup();
    const result = { id: 'subject' };
    user.update.mockResolvedValue(result);
    await expect(
      store.updateById('subject', { displayName: 'Pilot' }),
    ).resolves.toBe(result);
    const query = user.update.mock.calls[0][0] as {
      where: unknown;
      data: unknown;
      select: object;
    };
    expect(query.where).toEqual({ id: 'subject' });
    expect(query.data).toEqual(profileUpdateData({ displayName: 'Pilot' }));
    expect(Object.keys(query.select).sort()).toEqual(selectedFields);
    expect(user.findUnique).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('IAM role display ownership', () => {
  it('retains exact selection/order and ignores unrelated assignment evidence', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        userId: 'subject',
        role: { name: 'observer', privateConfiguration: 'never copied' },
      },
      { userId: 'subject', role: { name: 'PILOT' } },
      { userId: 'unrequested', role: { name: 'not copied' } },
    ]);
    const reader = new PrismaRoleDisplayReader({
      userRole: { findMany },
    } as unknown as PrismaService);
    await expect(reader.readNames(['subject', 'missing'])).resolves.toEqual(
      new Map([
        ['subject', ['observer', 'PILOT']],
        ['missing', []],
      ]),
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: { in: ['subject', 'missing'] } },
      select: { userId: true, role: { select: { name: true } } },
      orderBy: { assignedAt: 'asc' },
    });
    findMany.mockResolvedValue([]);
    await expect(reader.readNames([])).resolves.toEqual(new Map());
    expect(findMany).toHaveBeenLastCalledWith({
      where: { userId: { in: [] } },
      select: { userId: true, role: { select: { name: true } } },
      orderBy: { assignedAt: 'asc' },
    });
  });
  it('copies requested display arrays and propagates provider failures', async () => {
    const original = ['pilot'];
    const readNames = jest.fn().mockResolvedValue(
      new Map([
        ['subject', original],
        ['unrequested', ['hidden']],
      ]),
    );
    const adapter = new ProfileRoleNamesAdapter({
      readNames,
    });
    const result = await adapter.readNames(['subject', 'missing']);
    expect(result).toEqual(
      new Map([
        ['subject', ['pilot']],
        ['missing', []],
      ]),
    );
    expect(result.get('subject')).not.toBe(original);
    original.push('changed');
    expect(result.get('subject')).toEqual(['pilot']);
    const error = new Error('role provider failed');
    readNames.mockRejectedValueOnce(error);
    await expect(adapter.readNames(['subject'])).rejects.toBe(error);
  });
  it('propagates IAM storage failure instead of inventing role names', async () => {
    const error = new Error('role database failed');
    const reader = new PrismaRoleDisplayReader({
      userRole: { findMany: jest.fn().mockRejectedValue(error) },
    } as unknown as PrismaService);
    await expect(reader.readNames(['subject'])).rejects.toBe(error);
  });
});
