import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type { PrismaService } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';
import { PrismaPasswordResetRepository } from './prisma-password-reset.repository';

// Opt-in integration suite uses isolated tables, never application records.
const dbSuite =
  process.env.RUN_RECOVERY_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('password reset PostgreSQL transaction', () => {
  const schema = `recovery_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  const append = jest.fn(() => Promise.resolve('audit'));
  const repository = new PrismaPasswordResetRepository(
    prisma as unknown as PrismaService,
    { append } as unknown as AuditWriterService,
  );
  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await pool.query(
      `CREATE TABLE users (LIKE public.users INCLUDING ALL); CREATE TABLE sessions (LIKE public.sessions INCLUDING ALL); CREATE TABLE password_resets ("userId" TEXT PRIMARY KEY, "tokenHash" TEXT UNIQUE NOT NULL, "authVersion" INTEGER NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW())`,
    );
  });
  beforeEach(async () => {
    append.mockReset().mockResolvedValue('audit');
    await pool.query('TRUNCATE password_resets, sessions, users');
    await pool.query(
      `INSERT INTO users (id,email,username,"passwordHash","updatedAt") VALUES ('u','dev@example.test','dev','old',NOW())`,
    );
    await pool.query(
      `INSERT INTO sessions (id,"userId","tokenHash","expiresAt","updatedAt") VALUES ('s','u','session',NOW()+INTERVAL '1 day',NOW())`,
    );
    await pool.query(
      `INSERT INTO password_resets ("userId","tokenHash","authVersion","expiresAt") VALUES ('u','digest',0,NOW()+INTERVAL '30 minutes')`,
    );
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
    // Only the unique schema created by this test is removed.
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  it('allows exactly one concurrent consumer and revokes sessions', async () => {
    const results = await Promise.all([
      repository.consume('digest', 'new-a'),
      repository.consume('digest', 'new-b'),
    ]);
    expect(results.sort()).toEqual([false, true]);
    const user = await pool.query<{
      authVersion: number;
      passwordHash: string;
    }>('SELECT "authVersion", "passwordHash" FROM users');
    expect(user.rows[0].authVersion).toBe(1);
    expect(['new-a', 'new-b']).toContain(user.rows[0].passwordHash);
    expect(
      (
        await pool.query<{ revokedAt: Date | null }>(
          'SELECT "revokedAt" FROM sessions',
        )
      ).rows[0].revokedAt,
    ).not.toBeNull();
    expect(await repository.consume('digest', 'replay')).toBe(false);
  });
  it('rejects expired and version-invalidated tokens without changing the password', async () => {
    await pool.query(
      `UPDATE password_resets SET "expiresAt"=NOW()-INTERVAL '1 second'`,
    );
    expect(await repository.consume('digest', 'bad')).toBe(false);
    await pool.query(
      `UPDATE password_resets SET "expiresAt"=NOW()+INTERVAL '1 day', "authVersion"=9`,
    );
    expect(await repository.consume('digest', 'bad')).toBe(false);
    expect(
      (
        await pool.query<{ passwordHash: string }>(
          'SELECT "passwordHash" FROM users',
        )
      ).rows[0].passwordHash,
    ).toBe('old');
  });
  it('rolls back password, consumption and revocations if auditing fails', async () => {
    append.mockRejectedValueOnce(new Error('audit failed'));
    await expect(repository.consume('digest', 'new')).rejects.toThrow(
      'audit failed',
    );
    expect(
      (
        await pool.query<{ passwordHash: string }>(
          'SELECT "passwordHash" FROM users',
        )
      ).rows[0].passwordHash,
    ).toBe('old');
    expect(
      (
        await pool.query<{ revokedAt: Date | null }>(
          'SELECT "revokedAt" FROM sessions',
        )
      ).rows[0].revokedAt,
    ).toBeNull();
    expect(await repository.consume('digest', 'retry')).toBe(true);
  });
});
