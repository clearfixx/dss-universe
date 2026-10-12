/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-two-factor.repository.spec.ts
 *
 * 🎯 Purpose:
 * Proves second-factor single-use and rollback invariants in isolated PostgreSQL.
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
import { PrismaTwoFactorRepository } from './prisma-two-factor.repository';

const dbSuite =
  process.env.RUN_AUTH_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('second-factor PostgreSQL transaction', () => {
  const schema = `factor_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  const append = jest.fn(() => Promise.resolve('audit'));
  const repository = new PrismaTwoFactorRepository(
    prisma as unknown as PrismaService,
    { append } as unknown as AuditWriterService,
  );
  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await pool.query('CREATE TABLE users (LIKE public.users INCLUDING ALL)');
    await pool.query(
      'CREATE TABLE sessions (LIKE public.sessions INCLUDING ALL)',
    );
    await pool.query(
      'CREATE TABLE user_two_factor (LIKE public.user_two_factor INCLUDING ALL)',
    );
  });
  beforeEach(async () => {
    append.mockReset().mockResolvedValue('audit');
    await pool.query('TRUNCATE users, sessions, user_two_factor');
    await pool.query(
      `INSERT INTO users (id,email,username,"passwordHash","updatedAt") VALUES ('u','astro@dss.test','astro','synthetic-hash',NOW())`,
    );
    await pool.query(
      `INSERT INTO sessions (id,"userId","tokenHash","expiresAt","updatedAt") VALUES ('s','u','synthetic',NOW()+INTERVAL '1 hour',NOW())`,
    );
    await pool.query(
      `INSERT INTO user_two_factor ("userId","encryptedSecret","updatedAt") VALUES ('u','encrypted',NOW())`,
    );
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  it('returns safe status and minimal credential values', async () => {
    expect(await repository.status('u')).toEqual({
      enabled: false,
      recoveryCodesRemaining: 0,
    });
    expect(await repository.findEnabledSecret('u')).toBeNull();
    expect(await repository.findPasswordHash('u')).toBe('synthetic-hash');
    expect(await repository.findPasswordHash('missing')).toBeNull();
  });
  it('replaces pending setup but refuses enabled setup', async () => {
    expect(await repository.begin('u', 'replacement')).toBe(true);
    await repository.confirm('u', () => true, ['h']);
    expect(await repository.begin('u', 'forbidden')).toBe(false);
    expect(await repository.findEnabledSecret('u')).toBe('replacement');
  });
  it('serializes concurrent confirmations with one winner', async () => {
    const verify = jest.fn((encrypted: string) => encrypted === 'encrypted');
    const results = await Promise.all([
      repository.confirm('u', verify, ['h']),
      repository.confirm('u', verify, ['h']),
    ]);
    expect(results.sort()).toEqual(['confirmed', 'missing']);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledTimes(1);
    expect(await repository.status('u')).toEqual({
      enabled: true,
      recoveryCodesRemaining: 1,
    });
  });
  it('rejects invalid proof and missing setup without audit', async () => {
    expect(await repository.confirm('u', () => false, ['h'])).toBe('invalid');
    expect(await repository.confirm('missing', () => true, ['h'])).toBe(
      'missing',
    );
    expect(await repository.status('u')).toEqual({
      enabled: false,
      recoveryCodesRemaining: 0,
    });
    expect(append).not.toHaveBeenCalled();
  });
  it('rolls back enabling and recovery hashes on audit failure', async () => {
    append.mockRejectedValueOnce(new Error('audit failed'));
    await expect(repository.confirm('u', () => true, ['h'])).rejects.toThrow(
      'audit failed',
    );
    expect(await repository.status('u')).toEqual({
      enabled: false,
      recoveryCodesRemaining: 0,
    });
  });
  it('consumes concurrent recovery copies once and preserves unrelated hashes', async () => {
    await repository.confirm('u', () => true, ['h', 'other']);
    append.mockClear();
    const results = await Promise.all([
      repository.consumeRecovery('u', 'h'),
      repository.consumeRecovery('u', 'h'),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await repository.status('u')).toEqual({
      enabled: true,
      recoveryCodesRemaining: 1,
    });
    expect(append).toHaveBeenCalledTimes(1);
    expect(await repository.consumeRecovery('missing', 'h')).toBe(false);
  });
  it('restores a recovery hash when audit fails', async () => {
    await repository.confirm('u', () => true, ['h']);
    append.mockRejectedValueOnce(new Error('audit failed'));
    await expect(repository.consumeRecovery('u', 'h')).rejects.toThrow(
      'audit failed',
    );
    expect((await repository.status('u')).recoveryCodesRemaining).toBe(1);
  });
  it('disables, revokes sessions and increments auth version atomically', async () => {
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: 'u' },
      select: { authVersion: true },
    });
    await repository.disable('u');
    expect(await repository.findEnabledSecret('u')).toBeNull();
    expect(await prisma.userTwoFactor.count()).toBe(0);
    expect(
      (
        await prisma.session.findUniqueOrThrow({
          where: { id: 's' },
          select: { revokedAt: true },
        })
      ).revokedAt,
    ).toBeInstanceOf(Date);
    expect(
      (
        await prisma.user.findUniqueOrThrow({
          where: { id: 'u' },
          select: { authVersion: true },
        })
      ).authVersion,
    ).toBe(before.authVersion + 1);
  });
  it('rolls back deletion, revocation and auth version on audit failure', async () => {
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: 'u' },
      select: { authVersion: true },
    });
    append.mockRejectedValueOnce(new Error('audit failed'));
    await expect(repository.disable('u')).rejects.toThrow('audit failed');
    expect(await prisma.userTwoFactor.count()).toBe(1);
    expect(
      (
        await prisma.session.findUniqueOrThrow({
          where: { id: 's' },
          select: { revokedAt: true },
        })
      ).revokedAt,
    ).toBeNull();
    expect(
      (
        await prisma.user.findUniqueOrThrow({
          where: { id: 'u' },
          select: { authVersion: true },
        })
      ).authVersion,
    ).toBe(before.authVersion);
  });
});
