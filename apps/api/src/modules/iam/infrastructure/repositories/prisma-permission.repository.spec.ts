/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Permissions
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-permission.repository.spec.ts
 *
 * 🎯 Purpose:
 * Proves permission persistence and atomic audit rollback in isolated PostgreSQL tables.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { AuditWriterService, AuditRedactionService } from '@api/core/audit';
import { PrismaPermissionRepository } from './prisma-permission.repository';

const dbSuite = process.env.RUN_IAM_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('IAM permissions PostgreSQL boundary', () => {
  const schema = `iam_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaService({ adapter: new PrismaPg(pool, { schema }) });
  const audit = new AuditWriterService(new AuditRedactionService());
  const repository = new PrismaPermissionRepository(prisma, audit);
  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await pool.query(
      'CREATE DOMAIN "AuditActorType" AS public."AuditActorType"',
    );
    await pool.query('CREATE DOMAIN "AuditResult" AS public."AuditResult"');
    await pool.query(
      'CREATE TABLE permissions (LIKE public.permissions INCLUDING ALL)',
    );
    await pool.query(
      'CREATE TABLE audit_records (LIKE public.audit_records INCLUDING ALL)',
    );
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE permissions, audit_records');
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  it('commits allowlisted permission fields and actor audit together', async () => {
    const created = await repository.createWithAudit(
      { key: 'test.read', label: 'Read' },
      'actor',
    );
    expect(Object.keys(created).sort()).toEqual(
      ['id', 'key', 'label', 'description', 'createdAt', 'updatedAt'].sort(),
    );
    expect(created.description).toBeNull();
    const records = (
      await pool.query(
        'SELECT action, "actorType", "actorId", "targetId", metadata FROM audit_records',
      )
    ).rows;
    expect(records).toEqual([
      {
        action: 'iam.permission.created',
        actorType: 'USER',
        actorId: 'actor',
        targetId: created.id,
        metadata: { key: 'test.read', label: 'Read' },
      },
    ]);
  });
  it('rolls creation back when audit fails after writing its row', async () => {
    const append = jest
      .spyOn(audit, 'append')
      .mockImplementationOnce(async (tx, entry) => {
        await AuditWriterService.prototype.append.call(audit, tx, entry);
        throw new Error('synthetic audit failure');
      });
    try {
      await expect(
        repository.createWithAudit({ key: 'test.rollback', label: 'Rollback' }),
      ).rejects.toThrow('synthetic audit failure');
      expect(await prisma.permission.count()).toBe(0);
      expect(await prisma.auditRecord.count()).toBe(0);
    } finally {
      append.mockRestore();
    }
  });
  it('retains unique-key integrity under concurrent creation', async () => {
    const result = await Promise.allSettled(
      Array.from({ length: 2 }, () =>
        repository.createWithAudit({ key: 'test.unique', label: 'Unique' }),
      ),
    );
    expect(result.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(result.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    expect(await prisma.permission.count()).toBe(1);
    const records = await prisma.auditRecord.findMany({
      select: { actorType: true, actorId: true },
    });
    expect(records).toEqual([{ actorType: 'SYSTEM', actorId: null }]);
  });
  it('preserves ordered reads, updates and deletion without adding mutation audit', async () => {
    const z = await repository.createWithAudit({
      key: 'test.z',
      label: 'Z',
      description: 'Original',
    });
    await repository.createWithAudit({ key: 'test.a', label: 'A' });
    expect((await repository.findAll()).map(({ key }) => key)).toEqual([
      'test.a',
      'test.z',
    ]);
    expect(await repository.findIdByKey('test.z')).toBe(z.id);
    expect(await repository.findIdByKey('missing')).toBeNull();
    expect(await repository.findById('missing')).toBeNull();
    const updated = await repository.update(z.id, {
      key: 'test.b',
      label: 'B',
    });
    expect(updated.description).toBe('Original');
    expect(await repository.findById(z.id)).toEqual(updated);
    await repository.remove(z.id);
    expect(await repository.findById(z.id)).toBeNull();
    expect(await prisma.auditRecord.count()).toBe(2);
  });
});
