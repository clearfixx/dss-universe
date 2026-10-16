/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Subject Boundary Characterization
 * 📄 File: apps/api/test/transactional-subject-checks.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Pins existing ID-only checks before cross-owner transaction and subject-anchor transfer.
 *
 * 🧠 Responsibilities:
 * • records all-state existence, short-circuit precedence, query order and native transaction options;
 * • proves real audit/outbox rollback and preserves existing role safety policy.
 *
 * 🏗️ Architecture:
 * Actual AppModule in an owned fully migrated schema; repository fixtures are not authentication evidence.
 *
 * ⚠️ Important:
 * No ACTIVE filter, authorization success mock, timeout change or disabled history protection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import { AppModule } from '../src/app.module';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import {
  ACHIEVEMENTS_REPOSITORY,
  type AchievementsRepository,
} from '../src/modules/achievements/domain/repositories/achievements.repository.interface';
import {
  CUSTOM_TITLES_REPOSITORY,
  type CustomTitlesRepository,
} from '../src/modules/custom-titles/domain/repositories/custom-titles.repository.interface';
import {
  IAM_ACCESS_GROUP_REPOSITORY,
  type AccessGroupRepository,
} from '../src/modules/iam/access-groups/contracts/access-group.repository.interface';
import {
  IAM_SUBJECT_ACCESS_REPOSITORY,
  type SubjectAccessRepository,
} from '../src/modules/iam/user-access/contracts/subject-access.repository.interface';
import {
  IAM_ROLE_REVOCATION_REPOSITORY,
  type RoleRevocationRepository,
} from '../src/modules/iam/user-access/contracts/role-revocation.repository.interface';
import { IamSafetyService } from '../src/modules/iam/safety/iam-safety.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

const states = ['ACTIVE', 'DEACTIVATED', 'BANNED', 'DELETED'] as const;
describe('Transactional subject checks (e2e)', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let awards: AchievementsRepository;
  let titles: CustomTitlesRepository;
  let groups: AccessGroupRepository;
  let access: SubjectAccessRepository;
  let revocation: RoleRevocationRepository;
  let safety: IamSafetyService;
  let actor: string;
  let ids: string[];
  let roleId: string;
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
    awards = app.get(ACHIEVEMENTS_REPOSITORY);
    titles = app.get(CUSTOM_TITLES_REPOSITORY);
    groups = app.get(IAM_ACCESS_GROUP_REPOSITORY);
    access = app.get(IAM_SUBJECT_ACCESS_REPOSITORY);
    revocation = app.get(IAM_ROLE_REVOCATION_REPOSITORY);
    safety = app.get(IamSafetyService);
    actor = randomUUID();
    ids = states.map(() => randomUUID());
    await prisma.user.createMany({
      data: [actor, ...ids].map((id, index) => ({
        id,
        email: `${id}@dss.test`,
        username: `subject${index}`,
        passwordHash: 'synthetic-not-a-login-credential',
        status: index ? states[index - 1] : 'ACTIVE',
      })),
    });
    roleId = (
      await prisma.role.create({
        data: { name: 'boundary_role', label: 'Synthetic boundary role' },
      })
    ).id;
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  const reason = 'Synthetic boundary characterization';
  async function definition(kind: 'award' | 'title', isActive = true) {
    const key = randomUUID();
    const data = {
      name: key,
      slug: key,
      color: '#123456',
      badge: 'synthetic',
      createdById: actor,
      updatedById: actor,
      isActive,
    };
    return kind === 'award'
      ? prisma.achievementDefinition.create({ data: { ...data, key } })
      : prisma.customTitle.create({ data });
  }
  async function group(enabled = true) {
    const key = `boundary-${randomUUID()}`;
    return prisma.accessGroup.create({
      data: {
        key,
        displayName: key,
        kind: 'CUSTOM',
        enabled,
        createdById: actor,
      },
    });
  }
  async function grant(kind: 'award' | 'title' | 'group', subjectId = ids[0]) {
    if (kind === 'group') {
      const target = await group();
      return () =>
        groups.grant(
          {
            groupId: target.id,
            subjectId,
            validFrom: new Date(0),
            validUntil: null,
          },
          actor,
        );
    }
    const target = await definition(kind);
    return kind === 'award'
      ? () => awards.manualAward(subjectId, target.id, reason, actor)
      : () => titles.grant(subjectId, target.id, reason, actor);
  }
  async function snapshot() {
    return {
      awards: await prisma.achievementAward.count(),
      titles: await prisma.userTitleGrant.count(),
      memberships: await prisma.accessGroupMembership.count(),
      audit: await prisma.auditRecord.count(),
      outbox: await prisma.outboxEvent.count(),
    };
  }
  function subjectQueries() {
    return fixture.queries.filter(
      (query) =>
        /^SELECT\b/.test(query) &&
        query.includes(`FROM "${fixture.schema}"."users"`),
    );
  }
  function assertIdOnly() {
    expect(subjectQueries()).toHaveLength(1);
    const query = subjectQueries()[0];
    expect(query.split(' FROM ')[0]).toContain('"id"');
    for (const field of [
      'status',
      'email',
      'username',
      'passwordHash',
      'authVersion',
    ])
      expect(query).not.toContain(`"${field}"`);
  }
  it.each(states)(
    'retains ID-only persistence checks for existing %s subjects',
    async (status) => {
      const id = ids[states.indexOf(status)];
      for (const kind of ['award', 'title', 'group'] as const) {
        const write = await grant(kind, id);
        fixture.queries.length = 0;
        const result = await write();
        expect(result).not.toBeNull();
        if (kind !== 'group') expect(result).toMatchObject({ status: 'OK' });
        assertIdOnly();
      }
      await access.grantRole(id, roleId);
      fixture.queries.length = 0;
      await expect(
        revocation.revoke(id, roleId, (params) => {
          safety.assertLastAdminRoleIsNotRemoved(params);
        }),
      ).resolves.toBe('revoked');
      assertIdOnly();
    },
  );
  it('preserves independent subject existence and nullable assignment anchors for every state', async () => {
    for (const id of ids) {
      fixture.queries.length = 0;
      expect(await access.subjectExists(id)).toBe(true);
      assertIdOnly();
      expect(fixture.queries).not.toContain('COMMIT');
      fixture.queries.length = 0;
      expect(await access.findAssignments(id)).toEqual({
        subjectId: id,
        roles: [],
        directPermissions: [],
      });
      assertIdOnly();
      expect(fixture.queries).not.toContain('COMMIT');
    }
    expect(await access.subjectExists(randomUUID())).toBe(false);
    expect(await access.findAssignments(randomUUID())).toBeNull();
  });
  it.each(states)(
    'preserves populated independent assignment reads for %s without profile facts',
    async (status) => {
      const subjectId = ids[states.indexOf(status)];
      const suffix = randomUUID();
      const firstRole = await prisma.role.create({
        data: { name: `z-${suffix}`, label: 'First by assignment time' },
      });
      const secondRole = await prisma.role.create({
        data: { name: `a-${suffix}`, label: 'Second by assignment time' },
      });
      const firstPermission = await prisma.permission.create({
        data: { key: `z.${suffix}`, label: 'First direct assignment' },
      });
      const secondPermission = await prisma.permission.create({
        data: { key: `a.${suffix}`, label: 'Second direct assignment' },
      });
      const first = new Date('2026-01-01T00:00:00Z');
      const second = new Date('2026-01-02T00:00:00Z');
      await prisma.userRole.createMany({
        data: [
          { userId: subjectId, roleId: firstRole.id, assignedAt: first },
          { userId: subjectId, roleId: secondRole.id, assignedAt: second },
        ],
      });
      await prisma.userPermission.createMany({
        data: [
          {
            userId: subjectId,
            permissionId: firstPermission.id,
            assignedAt: first,
          },
          {
            userId: subjectId,
            permissionId: secondPermission.id,
            assignedAt: second,
          },
        ],
      });
      await prisma.rolePermission.create({
        data: { roleId: firstRole.id, permissionId: secondPermission.id },
      });
      try {
        fixture.queries.length = 0;
        expect(await access.findAssignments(subjectId)).toEqual({
          subjectId,
          roles: [
            {
              id: firstRole.id,
              name: firstRole.name,
              permissionKeys: [secondPermission.key],
            },
            { id: secondRole.id, name: secondRole.name, permissionKeys: [] },
          ],
          directPermissions: [
            { id: firstPermission.id, key: firstPermission.key },
            { id: secondPermission.id, key: secondPermission.key },
          ],
        });
        assertIdOnly();
        const tables = fixture.queries.map(
          (query) => /FROM "[^"]+"\."([^"]+)"/.exec(query)?.[1],
        );
        expect(tables).toHaveLength(7);
        expect(tables[0]).toBe('users');
        expect([...tables].sort()).toEqual([
          'permissions',
          'permissions',
          'role_permissions',
          'roles',
          'user_permissions',
          'user_roles',
          'users',
        ]);
        expect(tables.indexOf('roles')).toBeGreaterThan(
          tables.indexOf('user_roles'),
        );
        expect(tables.indexOf('role_permissions')).toBeGreaterThan(
          tables.indexOf('roles'),
        );
        expect(tables.lastIndexOf('permissions')).toBeGreaterThan(
          tables.indexOf('role_permissions'),
        );
        for (const table of ['user_roles', 'user_permissions']) {
          const query = fixture.queries[tables.indexOf(table)];
          expect(query).toContain(`"${table}"."assignedAt" ASC`);
        }
        expect(fixture.queries.every((query) => /^SELECT\b/.test(query))).toBe(
          true,
        );
      } finally {
        await prisma.userRole.deleteMany({ where: { userId: subjectId } });
        await prisma.userPermission.deleteMany({
          where: { userId: subjectId },
        });
      }
    },
  );
  it('keeps missing-recipient precedence while both owned award/title lookups still execute', async () => {
    const missing = randomUUID();
    fixture.queries.length = 0;
    await expect(
      awards.manualAward(missing, randomUUID(), reason, actor),
    ).resolves.toEqual({ status: 'USER_NOT_FOUND', award: null });
    assertIdOnly();
    expect(
      fixture.queries.some((query) =>
        query.includes('"achievement_definitions"'),
      ),
    ).toBe(true);
    fixture.queries.length = 0;
    await expect(
      titles.grant(missing, randomUUID(), reason, actor),
    ).resolves.toEqual({ status: 'USER_NOT_FOUND', grant: null });
    assertIdOnly();
    expect(
      fixture.queries.some((query) => query.includes('"custom_titles"')),
    ).toBe(true);
    fixture.queries.length = 0;
    await expect(
      revocation.revoke(missing, randomUUID(), (params) => {
        safety.assertLastAdminRoleIsNotRemoved(params);
      }),
    ).resolves.toBe('subject-not-found');
    assertIdOnly();
    expect(fixture.queries.some((query) => query.includes('FOR UPDATE'))).toBe(
      false,
    );
  });
  it('keeps group-not-enabled precedence before subject lookup', async () => {
    for (const groupId of [randomUUID(), (await group(false)).id]) {
      fixture.queries.length = 0;
      expect(
        await groups.grant(
          {
            groupId,
            subjectId: randomUUID(),
            validFrom: new Date(0),
            validUntil: null,
          },
          actor,
        ),
      ).toBeNull();
      expect(subjectQueries()).toHaveLength(0);
    }
    const target = await group();
    const before = await snapshot();
    expect(
      await groups.grant(
        {
          groupId: target.id,
          subjectId: randomUUID(),
          validFrom: new Date(0),
          validUntil: null,
        },
        actor,
      ),
    ).toBeNull();
    expect(await snapshot()).toEqual(before);
  });
  it('retains inactive-definition results without changing recipient eligibility', async () => {
    const award = await definition('award', false);
    const title = await definition('title', false);
    await expect(
      awards.manualAward(ids[2], award.id, reason, actor),
    ).resolves.toEqual({ status: 'ACHIEVEMENT_NOT_FOUND', award: null });
    await expect(
      titles.grant(ids[2], title.id, reason, actor),
    ).resolves.toEqual({ status: 'TITLE_NOT_FOUND', grant: null });
  });
  it('keeps existing-grant conflicts without duplicate ledger/evidence writes', async () => {
    for (const kind of ['award', 'title'] as const) {
      const write = await grant(kind);
      await write();
      const before = await snapshot();
      expect(await write()).toMatchObject({ status: 'CONFLICT' });
      expect(await snapshot()).toEqual(before);
    }
  });
  it.each([
    ['award', 'audit'],
    ['award', 'outbox'],
    ['title', 'audit'],
    ['title', 'outbox'],
    ['group', 'audit'],
  ] as const)(
    'rolls back %s after a genuine %s append failure',
    async (kind, stage) => {
      const write = await grant(kind);
      const before = await snapshot();
      const error = new Error('synthetic post-append failure');
      if (stage === 'audit') {
        const writer = app.get(AuditWriterService);
        const append = writer.append.bind(
          writer,
        ) as AuditWriterService['append'];
        jest.spyOn(writer, 'append').mockImplementationOnce(async (...args) => {
          await append(...args);
          throw error;
        });
      } else {
        const writer = app.get(OutboxWriterService);
        const append = writer.append.bind(
          writer,
        ) as OutboxWriterService['append'];
        jest.spyOn(writer, 'append').mockImplementationOnce(async (...args) => {
          await append(...args);
          throw error;
        });
      }
      fixture.queries.length = 0;
      await expect(write()).rejects.toBe(error);
      expect(fixture.queries.some((query) => /^INSERT\b/.test(query))).toBe(
        true,
      );
      expect(fixture.queries).toContain('ROLLBACK');
      expect(await snapshot()).toEqual(before);
    },
  );
  it('retains last-admin policy rejection under the real role lock', async () => {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: 'admin' },
    });
    await access.grantRole(actor, role.id);
    fixture.queries.length = 0;
    await expect(
      revocation.revoke(actor, role.id, (params) => {
        safety.assertLastAdminRoleIsNotRemoved(params);
      }),
    ).rejects.toThrow('Cannot remove the last user');
    assertIdOnly();
    expect(fixture.queries).toContain('ROLLBACK');
    expect(await access.hasRole(actor, role.id)).toBe(true);
  });
  it('keeps subject -> locked role -> assignment short-circuit ordering', async () => {
    fixture.queries.length = 0;
    await expect(
      revocation.revoke(ids[0], randomUUID(), (params) => {
        safety.assertLastAdminRoleIsNotRemoved(params);
      }),
    ).resolves.toBe('role-not-found');
    const subject = fixture.queries.findIndex((query) =>
      query.includes(`FROM "${fixture.schema}"."users"`),
    );
    const lock = fixture.queries.findIndex((query) =>
      query.includes('FOR UPDATE'),
    );
    expect(subject).toBeGreaterThanOrEqual(0);
    expect(lock).toBeGreaterThan(subject);
    await expect(
      revocation.revoke(ids[0], roleId, (params) => {
        safety.assertLastAdminRoleIsNotRemoved(params);
      }),
    ).resolves.toBe('assignment-not-found');
  });
  it('pins native transaction defaults and explicit role-revocation Read Committed', async () => {
    type StartOptions = {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: string;
    };
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
    const writes = [
      await grant('award'),
      await grant('title'),
      await grant('group'),
    ];
    await access.grantRole(ids[0], roleId);
    const spy = jest.spyOn(engine, 'transaction');
    for (const write of writes) await write();
    await revocation.revoke(ids[0], roleId, (params) => {
      safety.assertLastAdminRoleIsNotRemoved(params);
    });
    expect(
      spy.mock.calls
        .filter(([action]) => action === 'start')
        .map(([, , options]) => ({
          maxWait: options.maxWait,
          timeout: options.timeout,
          isolationLevel: options.isolationLevel,
        })),
    ).toEqual([
      { maxWait: 2000, timeout: 5000, isolationLevel: undefined },
      { maxWait: 2000, timeout: 5000, isolationLevel: undefined },
      { maxWait: 2000, timeout: 5000, isolationLevel: undefined },
      { maxWait: 2000, timeout: 5000, isolationLevel: 'ReadCommitted' },
    ]);
  });
  it.each(['award', 'title'] as const)(
    'serializes two %s grants observed behind the same real advisory lock',
    async (kind) => {
      const target = await definition(kind);
      const coordinate = `${kind === 'award' ? 'achievements:award' : 'custom-titles:grant'}:${ids[0]}:${target.id}`;
      let release!: () => void;
      let ready!: () => void;
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      const acquired = new Promise<void>((resolve) => {
        ready = resolve;
      });
      const holder = prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${coordinate}, 0))`;
        ready();
        await released;
      });
      await acquired;
      const write = () =>
        kind === 'award'
          ? awards.manualAward(ids[0], target.id, reason, actor)
          : titles.grant(ids[0], target.id, reason, actor);
      const results = Promise.allSettled([write(), write()]);
      try {
        const deadline = Date.now() + 2000;
        let waiting = 0;
        do {
          const [row] = await prisma.$queryRaw<
            { waiting: number }[]
          >`SELECT count(*)::int AS waiting FROM pg_locks
          WHERE locktype = 'advisory' AND NOT granted AND database = (SELECT oid FROM pg_database WHERE datname=current_database())
          AND classid::bigint = ((hashtextextended(${coordinate}, 0) >> 32) & 4294967295)
          AND objid::bigint = (hashtextextended(${coordinate}, 0) & 4294967295)`;
          waiting = row.waiting;
          if (waiting === 2) break;
        } while (Date.now() < deadline);
        expect(waiting).toBe(2);
      } finally {
        release();
        await holder;
      }
      const settled = await results;
      for (const result of settled)
        if (result.status === 'rejected') throw result.reason;
      expect(
        settled
          .map(
            (result) =>
              (result as PromiseFulfilledResult<{ status: string }>).value
                .status,
          )
          .sort(),
      ).toEqual(['CONFLICT', 'OK']);
    },
  );
});
