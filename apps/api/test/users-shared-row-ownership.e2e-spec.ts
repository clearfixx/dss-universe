/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Shared-row Boundary E2E
 * 📄 File: apps/api/test/users-shared-row-ownership.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Pins profile/directory behavior before isolating shared Auth and IAM persistence facts.
 *
 * 🧠 Responsibilities:
 * • verifies safe responses, active lookup rules, filters, roles, ordering and pagination;
 * • observes genuine single-query reads and the existing two-statement batch transaction;
 * • proves profile writes leave synthetic credentials and account state unchanged.
 *
 * 🏗️ Architecture:
 * Actual AppModule in an owned migrated schema; synthetic repository fixtures are not authentication evidence.
 *
 * ⚠️ Important:
 * No production schema, authorization policy, transaction budget or isolation change.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { AppModule } from '../src/app.module';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../src/modules/users/domain/repositories/users.repository.interface';
import { UsersService } from '../src/modules/users/application/services/users.service';
import { UserMapper } from '../src/modules/users/domain/mappers/user.mapper';
import type {
  ListUsersOptions,
  ListUsersSort,
} from '../src/modules/users/domain/options/list-users.options';
import {
  VIEWER_PROFILE_READER,
  type ViewerProfileReader,
} from '../src/modules/users/contracts/viewer-profile.contract';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

const safeFields = [
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
const states = [
  'ACTIVE',
  'ACTIVE',
  'ACTIVE',
  'DEACTIVATED',
  'BANNED',
  'DELETED',
] as const;

describe('Users shared-row ownership (e2e)', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let repository: UsersRepository;
  let users: UsersService;
  let viewer: ViewerProfileReader;
  let ids: string[];
  let roleIds: string[];
  const date = new Date('2026-01-01T00:00:00Z');

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    prisma = fixture.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    await app.init();
    repository = app.get(USERS_REPOSITORY);
    users = app.get(UsersService);
    viewer = app.get(VIEWER_PROFILE_READER);
    ids = states.map(() => randomUUID());
    await prisma.user.createMany({
      data: states.map((status, index) => ({
        id: ids[index],
        email: `boundary${index}@dss.test`,
        username: `boundary${index}`,
        displayName: index % 2 ? 'Research Pilot' : 'Space Explorer',
        passwordHash: `synthetic-hash-${index}`,
        refreshTokenHash: `synthetic-refresh-${index}`,
        authVersion: index + 1,
        loginFailedAttempts: index,
        loginLockedUntil: index ? date : null,
        deactivatedAt: status === 'DEACTIVATED' ? date : null,
        status,
        emailVerifiedAt: index % 2 ? date : null,
        createdAt: date,
        updatedAt: date,
        lastSeenAt:
          index === 1
            ? new Date('2026-01-03T00:00:00Z')
            : index === 2
              ? date
              : null,
        technologies: ['TypeScript'],
        interests: ['Space'],
      })),
    });
    roleIds = [randomUUID(), randomUUID(), randomUUID()];
    await prisma.role.createMany({
      data: ['pilot', 'PILOT', 'observer'].map((name, index) => ({
        id: roleIds[index],
        name,
        label: `Synthetic ${name}`,
      })),
    });
    await prisma.userRole.createMany({
      data: [
        {
          userId: ids[0],
          roleId: roleIds[0],
          assignedAt: new Date('2026-01-03T00:00:00Z'),
        },
        { userId: ids[0], roleId: roleIds[2], assignedAt: date },
        { userId: ids[1], roleId: roleIds[1], assignedAt: date },
        { userId: ids[4], roleId: roleIds[0], assignedAt: date },
      ],
    });
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });

  function selects(table: string) {
    return fixture.queries.filter(
      (query) =>
        /^SELECT\b/i.test(query) &&
        query.includes(`"${fixture.schema}"."${table}"`),
    );
  }
  async function legacyPage(options: ListUsersOptions = {}) {
    const page = options.pagination?.page ?? 1;
    const limit = options.pagination?.limit ?? 20;
    const search = options.search?.trim();
    const where = {
      status: options.status,
      ...(options.userIds ? { id: { in: options.userIds } } : {}),
      ...(options.role
        ? {
            roles: {
              some: {
                role: {
                  name: { equals: options.role, mode: 'insensitive' as const },
                },
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' as const } },
              {
                displayName: { contains: search, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };
    const orderBy =
      options.sort === 'OLDEST'
        ? [{ createdAt: 'asc' as const }, { id: 'asc' as const }]
        : options.sort === 'USERNAME_ASC'
          ? [{ username: 'asc' as const }, { id: 'asc' as const }]
          : options.sort === 'USERNAME_DESC'
            ? [{ username: 'desc' as const }, { id: 'asc' as const }]
            : options.sort === 'LAST_ACTIVE'
              ? [
                  {
                    lastSeenAt: {
                      sort: 'desc' as const,
                      nulls: 'last' as const,
                    },
                  },
                  { id: 'asc' as const },
                ]
              : [{ createdAt: 'desc' as const }, { id: 'asc' as const }];
    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      prisma.user.count({ where }),
    ]);
    return {
      items: items.map((row) => UserMapper.toSafeUser(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  function safePage(result: Awaited<ReturnType<UsersRepository['findMany']>>) {
    return {
      ...result,
      items: result.items.map((row) => UserMapper.toSafeUser(row)),
    };
  }

  it('preserves independent ID/email/username lookups for every account state', async () => {
    for (const [index, id] of ids.entries()) {
      for (const read of [
        () => repository.findById(id),
        () => repository.findByEmail(`boundary${index}@dss.test`),
        () => repository.findByUsername(`boundary${index}`),
      ]) {
        fixture.queries.length = 0;
        const result = await read();
        expect(result).toMatchObject({ id, status: states[index] });
        expect(Object.keys(UserMapper.toSafeUser(result!)).sort()).toEqual(
          safeFields,
        );
        expect(selects('users')).toHaveLength(1);
        expect(fixture.queries.some((query) => query === 'COMMIT')).toBe(false);
      }
    }
  });
  it('returns null for missing lookups and the existing domain error in the service', async () => {
    expect(await repository.findById(randomUUID())).toBeNull();
    expect(await repository.findByEmail('missing@dss.test')).toBeNull();
    expect(await repository.findByUsername('missing')).toBeNull();
    await expect(users.getById(randomUUID())).rejects.toThrow('User not found');
  });
  it('keeps ACTIVE-only public lookups without changing ordinary existence', async () => {
    for (const [index, id] of ids.entries()) {
      const byId = await repository.findPublicById(id);
      const byName = await repository.findPublicByUsername(`boundary${index}`);
      expect(byId?.id ?? null).toBe(index < 3 ? id : null);
      expect(byName?.id ?? null).toBe(index < 3 ? id : null);
      expect(await users.exists(id)).toBe(true);
    }
  });
  it('keeps ACTIVE-only batch lookup, duplicate inputs, missing IDs and empty input', async () => {
    const rows = await repository.findManyByIds([...ids, ids[0], randomUUID()]);
    expect(rows.map((row) => row.id).sort()).toEqual(ids.slice(0, 3).sort());
    fixture.queries.length = 0;
    expect(await repository.findManyByIds([])).toEqual([]);
    expect(selects('users')).toHaveLength(1);
  });
  it.each([
    'NEWEST',
    'OLDEST',
    'USERNAME_ASC',
    'USERNAME_DESC',
    'LAST_ACTIVE',
  ] as ListUsersSort[])(
    'matches the parent algorithm for %s ties and pagination',
    async (sort) => {
      for (const page of [1, 2, 5]) {
        const options = { sort, pagination: { page, limit: 2 } };
        const expected = await legacyPage(options);
        fixture.queries.length = 0;
        expect(safePage(await repository.findMany(options))).toEqual(expected);
        expect(selects('users')).toHaveLength(2);
        expect(selects('users')[0]).not.toContain('COUNT(');
        expect(selects('users')[1]).toContain('COUNT(');
        expect(fixture.queries).toContain('COMMIT');
      }
    },
  );
  it.each(['ACTIVE', 'DEACTIVATED', 'BANNED', 'DELETED'] as const)(
    'matches the parent status filter for %s',
    async (status) => {
      const options = { status, pagination: { page: 1, limit: 20 } };
      expect(safePage(await repository.findMany(options))).toEqual(
        await legacyPage(options),
      );
    },
  );
  it('combines trimmed case-insensitive search, role and ID filters before count/page', async () => {
    const options: ListUsersOptions = {
      search: '  pILot  ',
      role: 'PiLoT',
      status: 'ACTIVE',
      userIds: [ids[0], ids[1], ids[4]],
      pagination: { page: 1, limit: 1 },
    };
    const expected = await legacyPage(options);
    fixture.queries.length = 0;
    const result = await repository.findMany(options);
    expect(safePage(result)).toEqual(expected);
    expect(result).toMatchObject({ total: 1, totalPages: 1 });
    expect(result.items[0].id).toBe(ids[1]);
    expect(selects('users')).toHaveLength(2);
    expect(
      selects('users').every(
        (query) => query.includes('user_roles') && query.includes('roles'),
      ),
    ).toBe(true);
  });
  it('distinguishes absent IDs from an empty ID filter and keeps zero-page metadata', async () => {
    expect((await repository.findMany()).total).toBe(6);
    const empty = await repository.findMany({ userIds: [], search: '   ' });
    expect(empty).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    expect((await repository.findMany({ role: 'missing' })).total).toBe(0);
  });
  it('keeps exact role names in assignment order, including inactive subjects and missing IDs', async () => {
    const missing = randomUUID();
    const result = await users.roleNamesByUserIds([
      ids[0],
      ids[1],
      ids[2],
      ids[4],
      missing,
    ]);
    expect(result.get(ids[0])).toEqual(['observer', 'pilot']);
    expect(result.get(ids[1])).toEqual(['PILOT']);
    expect(result.get(ids[2])).toEqual([]);
    expect(result.get(ids[4])).toEqual(['pilot']);
    expect(result.get(missing)).toEqual([]);
    fixture.queries.length = 0;
    expect(await users.roleNamesByUserIds([])).toEqual(new Map());
    expect(selects('user_roles')).toHaveLength(1);
    expect(selects('users')).toHaveLength(0);
  });
  it('observes fresh Auth presentation facts and keeps the viewer response allowlist', async () => {
    const old = await prisma.user.findUniqueOrThrow({ where: { id: ids[2] } });
    try {
      await prisma.user.update({
        where: { id: ids[2] },
        data: { emailVerifiedAt: date, email: 'updated-boundary@dss.test' },
      });
      fixture.queries.length = 0;
      const profile = await viewer.findById(ids[2]);
      expect(profile).toMatchObject({
        email: 'updated-boundary@dss.test',
        emailVerifiedAt: date,
      });
      expect(Object.keys(profile!).sort()).toEqual(safeFields);
      expect(selects('users')).toHaveLength(1);
      const dto = await users.getById(ids[2]);
      expect(Object.keys(dto).sort()).toEqual(safeFields);
      expect(dto.emailVerifiedAt).toBe(date.toISOString());
    } finally {
      await prisma.user.update({
        where: { id: ids[2] },
        data: { email: old.email, emailVerifiedAt: old.emailVerifiedAt },
      });
    }
  });
  it('updates only requested profile values without changing credentials/account state', async () => {
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: ids[0] },
    });
    const result = await users.updateProfile(ids[0], {
      displayName: '  Boundary Pilot  ',
      bio: '  ',
      location: ' Kyiv ',
      website: null,
      technologies: [' TS ', 'ts', 'NestJS'],
      interests: [' Space ', 'space'],
    });
    expect(Object.keys(result).sort()).toEqual(safeFields);
    expect(result).toMatchObject({
      displayName: 'Boundary Pilot',
      bio: null,
      location: 'Kyiv',
      website: null,
      technologies: ['ts', 'NestJS'],
      interests: ['space'],
    });
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: ids[0] },
    });
    for (const key of [
      'passwordHash',
      'refreshTokenHash',
      'authVersion',
      'loginFailedAttempts',
      'loginLockedUntil',
      'status',
      'deactivatedAt',
      'email',
      'emailVerifiedAt',
    ] as const)
      expect(after[key]).toEqual(before[key]);
  });
  it('preserves missing-update failure without creating a profile', async () => {
    const id = randomUUID();
    await expect(
      repository.updateById(id, { displayName: 'Missing' }),
    ).rejects.toMatchObject({ code: 'P2025' });
    expect(await repository.findById(id)).toBeNull();
  });
  it('keeps the installed batch transaction defaults without explicit overrides', async () => {
    type StartOptions = {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: string;
    };
    // Test-only call-through observation of the pinned engine; production must use its public API.
    const engine = (
      prisma as unknown as {
        _engine: {
          transaction(
            action: string,
            headers: unknown,
            options: StartOptions,
          ): Promise<unknown>;
        };
      }
    )._engine;
    const calls = jest.spyOn(engine, 'transaction');
    await repository.findMany({ role: 'pilot', status: 'ACTIVE' });
    expect(
      calls.mock.calls
        .filter(([action]) => action === 'start')
        .map(([, , options]) => ({
          maxWait: options.maxWait,
          timeout: options.timeout,
          isolationLevel: options.isolationLevel,
        })),
    ).toEqual([{ maxWait: 2000, timeout: 5000, isolationLevel: undefined }]);
  });
});
