/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-login-abuse.repository.spec.ts
 *
 * 🎯 Purpose:
 * Verifies durable login concurrency and audit rollback in isolated PostgreSQL tables.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type { PrismaService } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';
import { PrismaLoginAbuseRepository } from './prisma-login-abuse.repository';

const dbSuite =
  process.env.RUN_AUTH_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('login abuse PostgreSQL transaction', () => {
  const schema = `login_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  const append = jest.fn(() => Promise.resolve('audit'));
  const repository = new PrismaLoginAbuseRepository(
    prisma as unknown as PrismaService,
    { append } as unknown as AuditWriterService,
  );
  const policy = { failureLimit: 5, lockMs: 900_000 };
  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await pool.query('CREATE TABLE users (LIKE public.users INCLUDING ALL)');
  });
  beforeEach(async () => {
    append.mockReset().mockResolvedValue('audit');
    await pool.query('TRUNCATE users');
    await pool.query(
      `INSERT INTO users (id,email,username,"passwordHash","updatedAt") VALUES ('u','astro@dss.test','astro','synthetic-hash',NOW())`,
    );
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  async function counters() {
    return (
      await pool.query<{
        loginFailedAttempts: number;
        loginLockedUntil: Date | null;
      }>('SELECT "loginFailedAttempts", "loginLockedUntil" FROM users')
    ).rows[0];
  }
  it('serializes concurrent failures without lost increments and emits one lock transition', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        repository.recordFailure('u', policy, {}),
      ),
    );
    expect(results.filter(Boolean)).toEqual([{ email: 'astro@dss.test' }]);
    expect((await counters()).loginFailedAttempts).toBe(5);
    expect((await counters()).loginLockedUntil).toBeInstanceOf(Date);
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]).toEqual([
      expect.anything(),
      expect.objectContaining({
        action: 'auth.login.locked',
        result: 'DENIED',
        metadata: { attempts: 5, lockMinutes: 15 },
      }),
    ]);
  });
  it('retains an existing lock without repeating its notification', async () => {
    await pool.query(
      `UPDATE users SET "loginFailedAttempts"=5, "loginLockedUntil"=NOW()+INTERVAL '1 minute'`,
    );
    expect(await repository.recordFailure('u', policy, {})).toBeNull();
    expect((await counters()).loginFailedAttempts).toBe(6);
    expect(append).not.toHaveBeenCalled();
  });
  it('rolls back the counter and new lock when audit fails', async () => {
    await pool.query('UPDATE users SET "loginFailedAttempts"=4');
    append.mockRejectedValueOnce(new Error('audit failed'));
    await expect(repository.recordFailure('u', policy, {})).rejects.toThrow(
      'audit failed',
    );
    expect(await counters()).toEqual({
      loginFailedAttempts: 4,
      loginLockedUntil: null,
    });
  });
  it('resets counters and lock atomically with a successful-login audit', async () => {
    await pool.query(
      `UPDATE users SET "loginFailedAttempts"=5, "loginLockedUntil"=NOW()+INTERVAL '1 minute'`,
    );
    await repository.recordSuccess('u', { ipAddress: '127.0.0.1' });
    expect(await counters()).toEqual({
      loginFailedAttempts: 0,
      loginLockedUntil: null,
    });
    expect(append).toHaveBeenCalledTimes(1);
  });
  it('rolls back a successful-login reset when audit fails', async () => {
    await pool.query('UPDATE users SET "loginFailedAttempts"=4');
    append.mockRejectedValueOnce(new Error('audit failed'));
    await expect(repository.recordSuccess('u', {})).rejects.toThrow(
      'audit failed',
    );
    expect((await counters()).loginFailedAttempts).toBe(4);
  });
  it('returns no destination or audit for a missing account', async () => {
    expect(await repository.recordFailure('missing', policy, {})).toBeNull();
    expect(append).not.toHaveBeenCalled();
  });
});
