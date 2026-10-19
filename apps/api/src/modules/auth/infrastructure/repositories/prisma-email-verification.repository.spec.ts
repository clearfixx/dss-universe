/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-email-verification.repository.spec.ts
 *
 * 🎯 Purpose:
 * Verifies minimal eligibility reads and atomic single-use verification in isolated PostgreSQL.
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
import { PrismaEmailVerificationRepository } from './prisma-email-verification.repository';
import { PrismaAccountCredentialsRepository } from './prisma-account-credentials.repository';

const dbSuite =
  process.env.RUN_AUTH_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('email verification PostgreSQL transaction', () => {
  const schema = `verification_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  const append = jest.fn(() => Promise.resolve('audit'));
  const repository = new PrismaEmailVerificationRepository(
    prisma as unknown as PrismaService,
    { append } as unknown as AuditWriterService,
  );
  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const enumDefinition = await admin.query<{ ddl: string }>(
      `SELECT format('CREATE TYPE %I."UserStatus" AS ENUM (%s)', $1::text,
       string_agg(quote_literal(value::text), ',')) AS ddl
       FROM unnest(enum_range(NULL::public."UserStatus")) AS value`,
      [schema],
    );
    await admin.query(enumDefinition.rows[0].ddl);
    await pool.query('CREATE TABLE users (LIKE public.users INCLUDING ALL)');
    await pool.query('ALTER TABLE users ALTER COLUMN status DROP DEFAULT');
    await pool.query(
      `ALTER TABLE users ALTER COLUMN status TYPE "${schema}"."UserStatus" USING status::text::"${schema}"."UserStatus"`,
    );
    await pool.query(
      `ALTER TABLE users ALTER COLUMN status SET DEFAULT 'ACTIVE'`,
    );
    await pool.query(
      'CREATE TABLE email_verifications (LIKE public.email_verifications INCLUDING ALL)',
    );
    await pool.query(
      'CREATE TABLE sessions (LIKE public.sessions INCLUDING ALL)',
    );
  });
  beforeEach(async () => {
    append.mockReset().mockResolvedValue('audit');
    await pool.query('TRUNCATE users, email_verifications, sessions');
    await pool.query(
      `INSERT INTO users (id,email,username,"passwordHash","updatedAt") VALUES ('u','astro@dss.test','astro','synthetic-hash',NOW())`,
    );
    await pool.query(
      `INSERT INTO email_verifications ("userId","tokenHash","expiresAt") VALUES ('u','digest',NOW()+INTERVAL '1 hour')`,
    );
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  it('returns only the pending destination, not profile or credentials', async () => {
    expect(await repository.findPendingDestination('u')).toEqual({
      email: 'astro@dss.test',
    });
    expect(await repository.findPendingDestination('missing')).toBeNull();
    await pool.query(`UPDATE users SET "emailVerifiedAt"=NOW()`);
    expect(await repository.findPendingDestination('u')).toBeNull();
  });
  it('does not return an inactive account destination', async () => {
    await pool.query(`UPDATE users SET status='DEACTIVATED'`);
    expect(await repository.findPendingDestination('u')).toBeNull();
  });
  it('consumes concurrent copies once and commits verification with audit', async () => {
    const results = await Promise.all([
      repository.consume('digest'),
      repository.consume('digest'),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(
      (
        await pool.query<{ emailVerifiedAt: Date | null }>(
          'SELECT "emailVerifiedAt" FROM users',
        )
      ).rows[0].emailVerifiedAt,
    ).toBeInstanceOf(Date);
    expect(
      (await pool.query('SELECT * FROM email_verifications')).rows,
    ).toHaveLength(0);
    expect(append).toHaveBeenCalledTimes(1);
    expect(append.mock.calls[0]).toEqual([
      expect.anything(),
      expect.objectContaining({
        action: 'auth.email.verified',
        actorId: 'u',
        targetId: 'u',
      }),
    ]);
    expect(await repository.consume('digest')).toBe(false);
  });
  it('rejects expired and missing credentials without verification or audit', async () => {
    await pool.query(
      `UPDATE email_verifications SET "expiresAt"=NOW()-INTERVAL '1 second'`,
    );
    expect(await repository.consume('digest')).toBe(false);
    expect(await repository.consume('missing')).toBe(false);
    expect(
      (
        await pool.query<{ emailVerifiedAt: Date | null }>(
          'SELECT "emailVerifiedAt" FROM users',
        )
      ).rows[0].emailVerifiedAt,
    ).toBeNull();
    expect(append).not.toHaveBeenCalled();
  });
  it('rolls back token deletion and verification if audit fails', async () => {
    append.mockRejectedValueOnce(new Error('audit failed'));
    await expect(repository.consume('digest')).rejects.toThrow('audit failed');
    expect(
      (
        await pool.query<{ emailVerifiedAt: Date | null }>(
          'SELECT "emailVerifiedAt" FROM users',
        )
      ).rows[0].emailVerifiedAt,
    ).toBeNull();
    expect(
      (await pool.query('SELECT * FROM email_verifications')).rows,
    ).toHaveLength(1);
    expect(await repository.consume('digest')).toBe(true);
  });

  it('characterizes an old verification credential validating a changed email destination', async () => {
    const accounts = new PrismaAccountCredentialsRepository(
      prisma as unknown as PrismaService,
      { append } as unknown as AuditWriterService,
    );
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: 'u' },
      select: { authVersion: true },
    });
    await accounts.changeEmail('u', 'new-destination@dss.test');
    const changed = await prisma.user.findUniqueOrThrow({
      where: { id: 'u' },
      select: { email: true, emailVerifiedAt: true, authVersion: true },
    });
    expect(changed).toEqual({
      email: 'new-destination@dss.test',
      emailVerifiedAt: null,
      authVersion: before.authVersion + 1,
    });
    expect(await repository.consume('digest')).toBe(true);
    const verified = await prisma.user.findUniqueOrThrow({
      where: { id: 'u' },
      select: { email: true, emailVerifiedAt: true },
    });
    expect(verified.email).toBe('new-destination@dss.test');
    expect(verified.emailVerifiedAt).toBeInstanceOf(Date);
  });
});
