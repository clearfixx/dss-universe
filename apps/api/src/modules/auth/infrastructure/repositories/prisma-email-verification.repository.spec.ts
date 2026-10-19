/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-email-verification.repository.spec.ts
 *
 * 🎯 Purpose:
 * Verifies minimal eligibility reads and atomic single-use verification in isolated PostgreSQL.
 * Pins destination invalidation, rollback and lock-ordered API/Worker interleavings.
 * Native Worker source runs in a test child process; Audit is doubled here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import type { PrismaService } from '@api/core/database';
import type { AuditWriterService } from '@api/core/audit';
import { PrismaEmailVerificationRepository } from './prisma-email-verification.repository';
import { PrismaAccountCredentialsRepository } from './prisma-account-credentials.repository';
import type { RecoveryMail } from '../../../../../../worker/src/password-recovery.processor';

const dbSuite =
  process.env.RUN_AUTH_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('email verification PostgreSQL transaction', () => {
  const schema = `verification_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
    application_name: schema,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  const append = jest.fn(() => Promise.resolve('audit'));
  const repository = new PrismaEmailVerificationRepository(
    prisma as unknown as PrismaService,
    { append } as unknown as AuditWriterService,
  );
  const accounts = new PrismaAccountCredentialsRepository(
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

  it('rejects an old verification credential after an email destination change', async () => {
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
    expect(await repository.consume('digest')).toBe(false);
    const verified = await prisma.user.findUniqueOrThrow({
      where: { id: 'u' },
      select: { email: true, emailVerifiedAt: true },
    });
    expect(verified.email).toBe('new-destination@dss.test');
    expect(verified.emailVerifiedAt).toBeNull();
  });

  it('allows newly issued proof for the changed destination, once', async () => {
    await accounts.changeEmail('u', 'new-destination@dss.test');
    await prisma.emailVerification.create({
      data: {
        userId: 'u',
        tokenHash: 'new-digest',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    expect(await repository.consume('digest')).toBe(false);
    expect(await repository.consume('new-digest')).toBe(true);
    expect(await repository.consume('new-digest')).toBe(false);
  });

  it('preserves verification proof when only the password changes', async () => {
    await accounts.changePasswordHash('u', 'new-synthetic-hash');
    expect(await repository.consume('digest')).toBe(true);
  });

  it('rolls back email, version, proof invalidation and session revocation when audit fails', async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: 'u' } });
    await prisma.session.create({
      data: {
        id: 'session',
        userId: 'u',
        tokenHash: 'synthetic',
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    append.mockRejectedValueOnce(new Error('synthetic audit failure'));
    await expect(accounts.changeEmail('u', 'next@dss.test')).rejects.toThrow(
      'synthetic audit failure',
    );
    const after = await prisma.user.findUniqueOrThrow({ where: { id: 'u' } });
    expect(after.email).toBe(before.email);
    expect(after.authVersion).toBe(before.authVersion);
    expect(after.emailVerifiedAt).toBeNull();
    expect(await prisma.emailVerification.count()).toBe(1);
    expect(
      (await prisma.session.findUniqueOrThrow({ where: { id: 'session' } }))
        .revokedAt,
    ).toBeNull();
    expect(await repository.consume('digest')).toBe(true);
  });

  async function waitForSubjectWaiter(queryPattern = '%users%') {
    for (let attempt = 0; attempt < 200; attempt++) {
      const waiting = await pool.query<{ count: string }>(
        `SELECT count(*) FROM pg_stat_activity WHERE application_name=$1
         AND wait_event_type='Lock' AND query LIKE $2`,
        [schema, queryPattern],
      );
      if (Number(waiting.rows[0].count) > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error('Expected subject lock contention was not observed');
  }

  it.each(['change-first', 'consume-first'] as const)(
    'serializes email change and old proof consumption: %s',
    async (order) => {
      let signal!: () => void;
      let release!: () => void;
      const started = new Promise<void>((resolve) => {
        signal = resolve;
      });
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      append.mockImplementationOnce(async () => {
        signal();
        await released;
        return 'audit';
      });
      const first =
        order === 'change-first'
          ? accounts.changeEmail('u', 'next@dss.test')
          : repository.consume('digest');
      let second: Promise<void | boolean> | undefined;
      try {
        await Promise.race([
          started,
          first.then(() => {
            throw new Error(
              'First transaction completed without the audit barrier',
            );
          }),
        ]);
        second =
          order === 'change-first'
            ? repository.consume('digest')
            : accounts.changeEmail('u', 'next@dss.test');
        await waitForSubjectWaiter();
      } finally {
        release();
        await Promise.allSettled([first, second]);
      }
      await first;
      await second;
      if (order === 'change-first') expect(await second).toBe(false);
      else expect(await first).toBe(true);
      const subject = await prisma.user.findUniqueOrThrow({
        where: { id: 'u' },
      });
      expect(subject.email).toBe('next@dss.test');
      expect(subject.emailVerifiedAt).toBeNull();
      expect(await prisma.emailVerification.count()).toBe(0);
    },
  );

  function workerDelivery(email = 'astro@dss.test') {
    const sent: RecoveryMail[] = [];
    return {
      sent,
      run: () =>
        new Promise<void>((resolveRun, rejectRun) => {
          const child = execFile(
            process.execPath,
            [
              resolve(
                __dirname,
                '../../../../../test/helpers/verification-worker-probe.mjs',
              ),
            ],
            (error, stdout) => {
              if (error) {
                rejectRun(new Error('Native verification Worker probe failed'));
                return;
              }
              try {
                const result = JSON.parse(stdout) as RecoveryMail[];
                sent.push(...result);
                resolveRun();
              } catch {
                rejectRun(
                  new Error('Invalid verification Worker probe result'),
                );
              }
            },
          );
          child.stdin?.end(
            JSON.stringify({
              connectionString: process.env.DATABASE_URL,
              schema,
              email,
            }),
          );
        }),
    };
  }

  it('does not issue old-address proof when Worker waits behind email change', async () => {
    const worker = workerDelivery();
    let signal!: () => void;
    let release!: () => void;
    const started = new Promise<void>((resolve) => {
      signal = resolve;
    });
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    append.mockImplementationOnce(async () => {
      signal();
      await released;
      return 'audit';
    });
    const changing = accounts.changeEmail('u', 'next@dss.test');
    let issuing: Promise<void> | undefined;
    try {
      await Promise.race([
        started,
        changing.then(() => {
          throw new Error('Email change completed without the audit barrier');
        }),
      ]);
      issuing = worker.run();
      await waitForSubjectWaiter();
    } finally {
      release();
      await Promise.allSettled([changing, issuing]);
    }
    await changing;
    await issuing;
    expect(worker.sent).toHaveLength(0);
    expect(await prisma.emailVerification.count()).toBe(0);
    expect(await repository.consume('digest')).toBe(false);
  });

  it('invalidates old-address proof when email change waits behind Worker issuance', async () => {
    const worker = workerDelivery();
    const blocker = await pool.connect();
    const gate = `${schema}:issuance`;
    let functionCreated = false;
    let triggerCreated = false;
    let issuing: Promise<void> | undefined;
    let changing: Promise<void> | undefined;
    try {
      await blocker.query('SELECT pg_advisory_lock(hashtext($1))', [gate]);
      await pool.query(`CREATE FUNCTION pause_issuance() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN PERFORM pg_advisory_xact_lock(hashtext('${gate}')); RETURN NEW; END $$`);
      functionCreated = true;
      await pool.query(`CREATE TRIGGER pause_issuance BEFORE INSERT ON email_verifications
        FOR EACH ROW EXECUTE FUNCTION pause_issuance()`);
      triggerCreated = true;
      issuing = worker.run();
      await waitForSubjectWaiter('%INSERT INTO email_verifications%');
      changing = accounts.changeEmail('u', 'next@dss.test');
      await waitForSubjectWaiter('%UPDATE%users%');
    } finally {
      await blocker.query('SELECT pg_advisory_unlock(hashtext($1))', [gate]);
      blocker.release();
      await Promise.allSettled([issuing, changing]);
      if (triggerCreated)
        await pool.query('DROP TRIGGER pause_issuance ON email_verifications');
      if (functionCreated) await pool.query('DROP FUNCTION pause_issuance()');
    }
    await issuing;
    await changing;
    expect(worker.sent).toHaveLength(1);
    expect(worker.sent[0].to).toBe('astro@dss.test');
    expect(await prisma.emailVerification.count()).toBe(0);
    const subject = await prisma.user.findUniqueOrThrow({ where: { id: 'u' } });
    expect(subject.email).toBe('next@dss.test');
    expect(subject.emailVerifiedAt).toBeNull();
  });

  it('accepts fresh Worker-issued proof for the changed address', async () => {
    await accounts.changeEmail('u', 'next@dss.test');
    const worker = workerDelivery('next@dss.test');
    await worker.run();
    expect(worker.sent).toHaveLength(1);
    expect(worker.sent[0].to).toBe('next@dss.test');
    const token = worker.sent[0].text.match(/#token=([a-f0-9]{64})/)?.[1];
    expect(token).toBeDefined();
    expect(
      await repository.consume(
        createHash('sha256').update(token!).digest('hex'),
      ),
    ).toBe(true);
  });
});
