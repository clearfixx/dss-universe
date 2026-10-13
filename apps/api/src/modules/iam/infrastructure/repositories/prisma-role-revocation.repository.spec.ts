/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-role-revocation.repository.spec.ts
 *
 * 🎯 Purpose:
 * Proves atomic last-holder safety with real PostgreSQL lock barriers and rollback.
 *
 * 🧠 Responsibilities:
 * • isolates fixtures in an owned random schema;
 * • observes competing revocations blocked on the same role;
 * • verifies denial and storage errors preserve the final assignment.
 *
 * 🏗️ Architecture:
 * Opt-in integration suite using the production adapter and application safety rule.
 *
 * ⚠️ Important:
 * Only the owned schema is dropped. Public subjects and roles are never mutated.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { IamSafetyService } from '../../safety';
import { PrismaRoleRevocationRepository } from './prisma-role-revocation.repository';

const dbSuite = process.env.RUN_IAM_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('IAM atomic role revocation PostgreSQL', () => {
  const schema = `iam_revoke_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public -c application_name=${schema}`,
  });
  const prisma = new PrismaService({ adapter: new PrismaPg(pool, { schema }) });
  const repository = new PrismaRoleRevocationRepository(prisma);
  const safety = new IamSafetyService();
  const policy = (state: { roleName: string; adminsWithRoleCount: number }) => {
    safety.assertLastAdminRoleIsNotRemoved(state);
    return undefined;
  };

  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await pool.query('CREATE TABLE users (LIKE public.users INCLUDING ALL)');
    await pool.query('CREATE TABLE roles (LIKE public.roles INCLUDING ALL)');
    await pool.query(
      'CREATE TABLE user_roles (LIKE public.user_roles INCLUDING ALL)',
    );
    await pool.query(
      'ALTER TABLE user_roles ADD FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE, ADD FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE',
    );
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE user_roles, roles, users');
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  async function fixture(name: string, count = 1) {
    const role = await prisma.role.create({
      data: { name, label: name, isSystem: true },
    });
    const subjects: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = randomUUID();
      await pool.query(
        'INSERT INTO users (id,email,username,"passwordHash","createdAt","updatedAt") VALUES ($1,$2,$1,$3,NOW(),NOW())',
        [id, `${id}@dss.test`, 'synthetic-not-a-login-hash'],
      );
      await prisma.userRole.create({ data: { userId: id, roleId: role.id } });
      subjects.push(id);
    }
    return { roleId: role.id, subjects };
  }
  async function waitForBlocked(count: number) {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const result = await admin.query<{ count: string }>(
        "SELECT count(*) FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock'",
        [schema],
      );
      if (Number(result.rows[0].count) >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`Expected ${count} real blocked revocation transactions`);
  }
  it.each(['admin', 'super_admin'])(
    'preserves the sole %s assignment on policy denial',
    async (name) => {
      const { subjects, roleId } = await fixture(name);
      await expect(
        repository.revoke(subjects[0], roleId, policy),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(await prisma.userRole.count({ where: { roleId } })).toBe(1);
    },
  );
  it.each(['admin', 'super_admin'])(
    'serializes competing %s removals and preserves one holder',
    async (name) => {
      const { subjects, roleId } = await fixture(name, 2);
      const blocker = await pool.connect();
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM roles WHERE id=$1 FOR UPDATE', [
        roleId,
      ]);
      const pending = Promise.allSettled(
        subjects.map((id) => repository.revoke(id, roleId, policy)),
      );
      let barrierError: Error | undefined;
      try {
        await waitForBlocked(2);
      } catch (error) {
        barrierError =
          error instanceof Error
            ? error
            : new Error('Lock barrier failed', { cause: error });
      } finally {
        await blocker.query('COMMIT');
        blocker.release();
      }
      const outcomes = await pending;
      if (barrierError) throw barrierError;
      expect(outcomes.filter(({ status }) => status === 'fulfilled')).toEqual([
        { status: 'fulfilled', value: 'revoked' },
      ]);
      const denied = outcomes.filter(
        (outcome) => outcome.status === 'rejected',
      );
      expect(denied).toHaveLength(1);
      expect(denied[0].reason).toBeInstanceOf(BadRequestException);
      expect(await prisma.userRole.count({ where: { roleId } })).toBe(1);
    },
  );
  it('allows removal of the final ordinary role assignment', async () => {
    const { subjects, roleId } = await fixture('researcher');
    expect(await repository.revoke(subjects[0], roleId, policy)).toBe(
      'revoked',
    );
    expect(await prisma.userRole.count()).toBe(0);
  });
  it('returns established missing-entity outcomes without calling policy', async () => {
    const { subjects, roleId } = await fixture('researcher', 2);
    const guard = jest.fn();
    expect(await repository.revoke(randomUUID(), roleId, guard)).toBe(
      'subject-not-found',
    );
    expect(await repository.revoke(subjects[0], randomUUID(), guard)).toBe(
      'role-not-found',
    );
    await prisma.userRole.delete({
      where: { userId_roleId: { userId: subjects[0], roleId } },
    });
    expect(await repository.revoke(subjects[0], roleId, guard)).toBe(
      'assignment-not-found',
    );
    expect(guard).not.toHaveBeenCalled();
    expect(await prisma.userRole.count()).toBe(1);
  });
  it('rolls deletion back when storage fails after the row deletion', async () => {
    const { subjects, roleId } = await fixture('researcher');
    await pool.query(
      "CREATE FUNCTION reject_role_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic revocation storage failure'; END $$",
    );
    await pool.query(
      'CREATE TRIGGER reject_role_delete AFTER DELETE ON user_roles FOR EACH ROW EXECUTE FUNCTION reject_role_delete()',
    );
    try {
      await expect(
        repository.revoke(subjects[0], roleId, policy),
      ).rejects.toThrow('synthetic revocation storage failure');
      expect(await prisma.userRole.count({ where: { roleId } })).toBe(1);
    } finally {
      await pool.query('DROP TRIGGER reject_role_delete ON user_roles');
      await pool.query('DROP FUNCTION reject_role_delete()');
    }
  });
});
