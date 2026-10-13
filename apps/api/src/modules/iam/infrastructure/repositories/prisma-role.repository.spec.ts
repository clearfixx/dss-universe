/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Roles
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-role.repository.spec.ts
 *
 * 🎯 Purpose:
 * Proves role persistence, projection and atomic nested writes in PostgreSQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { PrismaRoleRepository } from './prisma-role.repository';

const dbSuite = process.env.RUN_IAM_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('IAM role PostgreSQL boundary', () => {
  const schema = `iam_roles_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaService({ adapter: new PrismaPg(pool, { schema }) });
  const repository = new PrismaRoleRepository(prisma);
  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await pool.query('CREATE TABLE roles (LIKE public.roles INCLUDING ALL)');
    await pool.query(
      'CREATE TABLE permissions (LIKE public.permissions INCLUDING ALL)',
    );
    await pool.query(
      'CREATE TABLE role_permissions (LIKE public.role_permissions INCLUDING ALL)',
    );
    await pool.query(
      'ALTER TABLE role_permissions ADD FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE, ADD FOREIGN KEY ("permissionId") REFERENCES permissions(id) ON DELETE CASCADE',
    );
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE role_permissions, roles, permissions');
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  it('selects allowlisted role fields with ordered permission summaries', async () => {
    const z = await prisma.permission.create({
      data: { key: 'test.z', label: 'Z' },
    });
    const a = await prisma.permission.create({
      data: { key: 'test.a', label: 'A' },
    });
    const role = await repository.create({
      name: 'z',
      label: 'Z',
      permissionIds: [z.id, a.id],
    });
    expect(Object.keys(role).sort()).toEqual(
      ['id', 'name', 'label', 'description', 'isSystem', 'permissions'].sort(),
    );
    expect(role.permissions.map(({ key }) => key)).toEqual([
      'test.a',
      'test.z',
    ]);
    expect(Object.keys(role.permissions[0]).sort()).toEqual(
      ['id', 'key', 'label', 'description'].sort(),
    );
    expect(await repository.findRecordById(role.id)).toEqual({
      id: role.id,
      name: 'z',
      label: 'Z',
      description: null,
      isSystem: false,
    });
    await repository.create({ name: 'a', label: 'A' });
    expect((await repository.findAll()).map(({ name }) => name)).toEqual([
      'a',
      'z',
    ]);
    expect(await repository.findIdByName('z')).toBe(role.id);
    expect(await repository.findIdByName('missing')).toBeNull();
    expect(await repository.findById(randomUUID())).toBeNull();
    expect(await repository.permissionExists(a.id)).toBe(true);
    expect(await repository.permissionExists(randomUUID())).toBe(false);
    expect(await repository.countPermissions([a.id, z.id, randomUUID()])).toBe(
      2,
    );
  });
  it('rolls nested role creation back on duplicate or missing permission assignment', async () => {
    const p = await prisma.permission.create({
      data: { key: 'test.p', label: 'P' },
    });
    await expect(
      repository.create({
        name: 'duplicate',
        label: 'Duplicate',
        permissionIds: [p.id, p.id],
      }),
    ).rejects.toThrow();
    await expect(
      repository.create({
        name: 'missing',
        label: 'Missing',
        permissionIds: [p.id, randomUUID()],
      }),
    ).rejects.toThrow();
    expect(await prisma.role.count()).toBe(0);
    expect(await prisma.rolePermission.count()).toBe(0);
  });
  it('preserves assignment uniqueness, metadata updates and cascading deletion', async () => {
    const p = await prisma.permission.create({
      data: { key: 'test.p', label: 'P' },
    });
    const role = await repository.create({
      name: 'original',
      label: 'Original',
    });
    expect(await repository.hasPermission(role.id, p.id)).toBe(false);
    const results = await Promise.allSettled([
      repository.assignPermission(role.id, p.id),
      repository.assignPermission(role.id, p.id),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    expect(await repository.hasPermission(role.id, p.id)).toBe(true);
    expect(
      await repository.update(role.id, {
        name: 'renamed',
        description: 'Changed',
      }),
    ).toMatchObject({
      name: 'renamed',
      description: 'Changed',
      label: 'Original',
    });
    await repository.revokePermission(role.id, p.id);
    expect((await repository.findById(role.id))?.permissions).toEqual([]);
    await repository.assignPermission(role.id, p.id);
    await repository.remove(role.id);
    expect(await repository.findRecordById(role.id)).toBeNull();
    expect(await prisma.rolePermission.count()).toBe(0);
  });
});
