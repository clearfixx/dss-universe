/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization Read Ownership Tests
 * 📄 File: apps/api/test/authorization-read-ownership.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Pins authoritative assignment facts before Core Authorization persistence transfer.
 *
 * 🧠 Responsibilities:
 * • exercises all-state anchors, empty/missing evidence and deduplication;
 * • captures real SQL shapes and proves new reads observe revocation.
 *
 * 🏗️ Architecture:
 * Actual AppModule in an owned fully migrated disposable schema.
 *
 * ⚠️ Important:
 * No successful authorization mock, ACTIVE filter, cache or timeout policy change.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { PermissionsRepository } from '@api/core/authorization';
import { AppModule } from '../src/app.module';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

const states = ['ACTIVE', 'DEACTIVATED', 'BANNED', 'DELETED'] as const;
describe('Authorization read ownership (e2e)', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let repository: PermissionsRepository;
  let ids: string[];
  let roles: Array<{ id: string; name: string }>;
  let permissions: Array<{ id: string; key: string }>;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    await app.init();
    repository = app.get(PermissionsRepository);
    ids = states.map(() => randomUUID());
    await fixture.prisma.user.createMany({
      data: ids.map((id, index) => ({
        id,
        email: id + '@dss.test',
        username: 'authz-' + id,
        passwordHash: 'synthetic-never-return',
        displayName: 'Never return profile',
        status: states[index],
      })),
    });
    roles = await Promise.all(
      ['z', 'a'].map((name) =>
        fixture.prisma.role.create({
          data: { name: name + '-' + randomUUID(), label: name },
        }),
      ),
    );
    permissions = await Promise.all(
      ['z', 'a'].map((key) =>
        fixture.prisma.permission.create({
          data: { key: key + '.' + randomUUID(), label: key },
        }),
      ),
    );
    await fixture.prisma.rolePermission.createMany({
      data: [
        { roleId: roles[0].id, permissionId: permissions[0].id },
        { roleId: roles[0].id, permissionId: permissions[1].id },
        { roleId: roles[1].id, permissionId: permissions[0].id },
      ],
    });
    for (const id of ids) {
      await fixture.prisma.userRole.createMany({
        data: roles.map(({ id: roleId }) => ({ userId: id, roleId })),
      });
      await fixture.prisma.userPermission.createMany({
        data: permissions.map(({ id: permissionId }) => ({
          userId: id,
          permissionId,
        })),
      });
    }
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  it.each(states)(
    'reads only assignment facts for existing %s anchor',
    async (status) => {
      fixture.queries.length = 0;
      const result = await repository.findAccessProfileByUserId(
        ids[states.indexOf(status)],
      );
      expect(Object.keys(result).sort()).toEqual(['permissions', 'roles']);
      expect([...result.roles].sort()).toEqual(
        roles.map(({ name }) => name).sort(),
      );
      expect([...result.permissions].sort()).toEqual(
        permissions.map(({ key }) => key).sort(),
      );
      expect(result.permissions).toHaveLength(2);
      const sql = fixture.queries;
      expect(sql.every((query) => /^SELECT\b/.test(query))).toBe(true);
      for (const field of [
        'email',
        'username',
        'displayName',
        'passwordHash',
        'status',
        'authVersion',
      ])
        expect(sql.join('\n')).not.toContain('"' + field + '"');
      expect(sql.join('\n')).not.toContain('ORDER BY');
      const tables = sql.map(
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
    },
  );
  it('preserves missing anchor as empty facts, not an eligibility or profile error', async () => {
    fixture.queries.length = 0;
    expect(await repository.findAccessProfileByUserId(randomUUID())).toEqual({
      roles: [],
      permissions: [],
    });
    expect(fixture.queries).toHaveLength(1);
  });
  it('retains empty existing anchor without fabricated grants', async () => {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: id + '@dss.test',
        passwordHash: 'synthetic',
        username: id,
      },
    });
    expect(await repository.findAccessProfileByUserId(id)).toEqual({
      roles: [],
      permissions: [],
    });
  });
  it('does no SQL work for empty role names', async () => {
    fixture.queries.length = 0;
    expect(await repository.findPermissionKeysByRoleNames([])).toEqual([]);
    expect(fixture.queries).toEqual([]);
  });
  it('deduplicates role permission keys and does not fabricate missing roles', async () => {
    fixture.queries.length = 0;
    const keys = await repository.findPermissionKeysByRoleNames(
      roles.map(({ name }) => name),
    );
    expect([...keys].sort()).toEqual(permissions.map(({ key }) => key).sort());
    expect(keys).toHaveLength(2);
    expect(fixture.queries).toHaveLength(2);
    expect(fixture.queries[0]).toContain('"role_permissions"');
    expect(fixture.queries[0]).toContain('LEFT JOIN');
    expect(fixture.queries[1]).toContain('"permissions"');
    expect(fixture.queries.every((query) => /^SELECT\b/.test(query))).toBe(
      true,
    );
    expect(
      await repository.findPermissionKeysByRoleNames([
        'missing-' + randomUUID(),
      ]),
    ).toEqual([]);
  });
  it('new reads observe removal of direct and role-derived grants without a cache', async () => {
    expect(
      (await repository.findAccessProfileByUserId(ids[0])).permissions,
    ).toHaveLength(2);
    await fixture.prisma.userPermission.deleteMany({
      where: { userId: ids[0] },
    });
    await fixture.prisma.userRole.deleteMany({ where: { userId: ids[0] } });
    expect(await repository.findAccessProfileByUserId(ids[0])).toEqual({
      roles: [],
      permissions: [],
    });
    await fixture.prisma.rolePermission.deleteMany({
      where: { roleId: { in: roles.map(({ id }) => id) } },
    });
    expect(
      await repository.findPermissionKeysByRoleNames(
        roles.map(({ name }) => name),
      ),
    ).toEqual([]);
  });
});
