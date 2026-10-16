/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Subject Read Composition
 * 📄 File: apps/api/src/composition/iam-subject-reads/infrastructure/iam-subject-access.persistence.spec.ts
 *
 * 🎯 Purpose:
 * Proves safe ordered IAM assignment facts and ordinary writes in real PostgreSQL.
 *
 * 🧠 Responsibilities:
 * • owns isolated random-schema fixtures with production-shaped constraints;
 * • checks exact returned fields and assignment order;
 * • verifies unique/FK integrity and direct-versus-role permission separation.
 *
 * 🏗️ Architecture:
 * Opt-in infrastructure integration tests; no production schema changes.
 *
 * ⚠️ Important:
 * The ordinary adapter cannot revoke roles or bypass final-holder protection.
 * Only this suite's schema is dropped; public records are untouched.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { PrismaSubjectAccessRepository } from '@api/modules/iam/infrastructure/repositories/prisma-subject-access.repository';
import { PrismaIamAssignmentReader } from '@api/composition/iam-subject-reads/infrastructure/prisma-iam-assignment.reader';
import { PrismaSubjectExistenceReader } from '@api/modules/auth/infrastructure/repositories/prisma-subject-existence.reader';

const dbSuite = process.env.RUN_IAM_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('IAM subject assignments PostgreSQL boundary', () => {
  const schema = `iam_access_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaService({ adapter: new PrismaPg(pool, { schema }) });
  const repository = new PrismaSubjectAccessRepository(
    prisma,
    new PrismaSubjectExistenceReader(prisma),
    new PrismaIamAssignmentReader(prisma),
  );
  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    for (const table of [
      'users',
      'roles',
      'permissions',
      'user_roles',
      'user_permissions',
      'role_permissions',
    ]) {
      await pool.query(
        `CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`,
      );
    }
    await pool.query(
      'ALTER TABLE user_roles ADD FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE, ADD FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE',
    );
    await pool.query(
      'ALTER TABLE user_permissions ADD FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE, ADD FOREIGN KEY ("permissionId") REFERENCES permissions(id) ON DELETE CASCADE',
    );
    await pool.query(
      'ALTER TABLE role_permissions ADD FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE, ADD FOREIGN KEY ("permissionId") REFERENCES permissions(id) ON DELETE CASCADE',
    );
  });
  beforeEach(async () => {
    await pool.query(
      'TRUNCATE user_roles, user_permissions, role_permissions, roles, permissions, users',
    );
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  async function fixture() {
    const subjectId = randomUUID();
    await pool.query(
      'INSERT INTO users (id,email,username,"passwordHash","displayName","createdAt","updatedAt") VALUES ($1,$2,$1,$3,$4,NOW(),NOW())',
      [
        subjectId,
        `${subjectId}@dss.test`,
        'never-return-hash',
        'Never return profile',
      ],
    );
    const role = await prisma.role.create({ data: { name: 'z', label: 'Z' } });
    const permission = await prisma.permission.create({
      data: { key: 'test.z', label: 'Z' },
    });
    return { subjectId, role, permission };
  }
  it('returns only ordered assignment facts, not profile or ORM relation wrappers', async () => {
    const { subjectId, role, permission } = await fixture();
    const aRole = await prisma.role.create({ data: { name: 'a', label: 'A' } });
    const aPermission = await prisma.permission.create({
      data: { key: 'test.a', label: 'A' },
    });
    const first = new Date('2026-01-01T00:00:00Z');
    const second = new Date('2026-01-02T00:00:00Z');
    await prisma.userRole.createMany({
      data: [
        { userId: subjectId, roleId: role.id, assignedAt: first },
        { userId: subjectId, roleId: aRole.id, assignedAt: second },
      ],
    });
    await prisma.userPermission.createMany({
      data: [
        { userId: subjectId, permissionId: permission.id, assignedAt: first },
        { userId: subjectId, permissionId: aPermission.id, assignedAt: second },
      ],
    });
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: aPermission.id },
    });
    expect(await repository.findAssignments(subjectId)).toEqual({
      subjectId,
      roles: [
        { id: role.id, name: 'z', permissionKeys: ['test.a'] },
        { id: aRole.id, name: 'a', permissionKeys: [] },
      ],
      directPermissions: [
        { id: permission.id, key: 'test.z' },
        { id: aPermission.id, key: 'test.a' },
      ],
    });
    expect(await repository.subjectExists(subjectId)).toBe(true);
    expect(await repository.roleExists(role.id)).toBe(true);
    expect(await repository.permissionExists(permission.id)).toBe(true);
    const missing = randomUUID();
    expect(await repository.findAssignments(missing)).toBeNull();
    expect(await repository.subjectExists(missing)).toBe(false);
    expect(await repository.roleExists(missing)).toBe(false);
    expect(await repository.permissionExists(missing)).toBe(false);
  });
  it('retains role uniqueness and FK integrity without an ordinary revocation operation', async () => {
    const { subjectId, role } = await fixture();
    expect(await repository.hasRole(subjectId, role.id)).toBe(false);
    const results = await Promise.allSettled([
      repository.grantRole(subjectId, role.id),
      repository.grantRole(subjectId, role.id),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    expect(await repository.hasRole(subjectId, role.id)).toBe(true);
    await expect(
      repository.grantRole(subjectId, randomUUID()),
    ).rejects.toThrow();
    expect(await prisma.userRole.count()).toBe(1);
    expect('revokeRole' in repository).toBe(false);
  });
  it('retains direct uniqueness and revokes only direct, not role-derived, permission', async () => {
    const { subjectId, role, permission } = await fixture();
    await repository.grantRole(subjectId, role.id);
    await prisma.rolePermission.create({
      data: { roleId: role.id, permissionId: permission.id },
    });
    expect(await repository.hasDirectPermission(subjectId, permission.id)).toBe(
      false,
    );
    const results = await Promise.allSettled([
      repository.grantPermission(subjectId, permission.id),
      repository.grantPermission(subjectId, permission.id),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    await expect(
      repository.grantPermission(randomUUID(), permission.id),
    ).rejects.toThrow();
    expect(await repository.hasDirectPermission(subjectId, permission.id)).toBe(
      true,
    );
    await repository.revokePermission(subjectId, permission.id);
    expect(await repository.hasDirectPermission(subjectId, permission.id)).toBe(
      false,
    );
    expect(await repository.findAssignments(subjectId)).toEqual({
      subjectId,
      roles: [{ id: role.id, name: 'z', permissionKeys: ['test.z'] }],
      directPermissions: [],
    });
    await expect(
      repository.revokePermission(subjectId, permission.id),
    ).rejects.toThrow();
    expect(await prisma.rolePermission.count()).toBe(1);
  });
});
