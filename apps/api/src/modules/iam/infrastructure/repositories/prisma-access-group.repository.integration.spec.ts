/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-access-group.repository.integration.spec.ts
 *
 * 🎯 Purpose:
 * Proves real migration constraints, membership validity and atomic audit rollback.
 *
 * 🧠 Responsibilities:
 * • executes the actual additive migration in an isolated schema;
 * • tests immutable history and Premium capability denial;
 * • observes concurrent revocation waiting on real PostgreSQL locks.
 *
 * 🏗️ Architecture:
 * Owned DB fixtures; no public accounts, roles or assignments are modified.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { applyAccessGroupMigration } from '../../../../../test/helpers/access-group-schema.fixture';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { AuditRedactionService } from '@api/core/audit/services/audit-redaction.service';
import { PrismaAccessGroupRepository } from './prisma-access-group.repository';
import type {
  AccessGroupRecord,
  CreateAccessGroup,
} from '../../access-groups/domain/access-group.types';

const dbSuite = process.env.RUN_IAM_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('IAM isolated access-group persistence', () => {
  const schema = `access_groups_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public -c application_name=${schema}`,
  });
  const prisma = new PrismaService({ adapter: new PrismaPg(pool, { schema }) });
  const audit = new AuditWriterService(new AuditRedactionService());
  const repository = new PrismaAccessGroupRepository(prisma, audit);
  const now = new Date('2030-01-01T00:00:00.000Z');
  const expiry = new Date('2030-02-01T00:00:00.000Z');
  let initialPremium: AccessGroupRecord | null;
  let initialAudits: number;

  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await pool.query('CREATE TABLE users (LIKE public.users INCLUDING ALL)');
    await pool.query(
      'CREATE TABLE audit_records (LIKE public.audit_records INCLUDING ALL)',
    );
    await applyAccessGroupMigration(pool);
    initialPremium = await repository.findById(
      '28d0a68d-0f24-4d92-9fe2-28eec10b3b10',
    );
    initialAudits = await prisma.auditRecord.count();
  }, 20000);
  beforeEach(async () => {
    jest.restoreAllMocks();
    await pool.query(
      'TRUNCATE access_group_memberships, access_group_capabilities, access_groups, audit_records, users',
    );
    await pool.query(
      `INSERT INTO users (id,email,username,"passwordHash","updatedAt") VALUES ('subject','synthetic@dss.test','subject','synthetic-hash',NOW()), ('manager','manager@dss.test','manager','synthetic-hash',NOW())`,
    );
    await pool.query(
      `INSERT INTO access_groups (id,key,"displayName",kind,"createdById","updatedAt") VALUES ('premium','premium','Premium','PREMIUM','manager',NOW())`,
    );
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });

  async function createGroup(
    key = 'guardians',
    capabilities: CreateAccessGroup['capabilities'] = [
      'KNOWLEDGE_FORGE_GUARDIAN',
    ],
  ) {
    return repository.create(
      { key, displayName: 'Guardians', capabilities },
      'manager',
    );
  }
  async function grant(
    groupId: string,
    validFrom = now,
    validUntil: Date | null = expiry,
  ) {
    return repository.grant(
      { groupId, subjectId: 'subject', validFrom, validUntil },
      'manager',
    );
  }

  it('applies the actual migration with a capability-free Premium role and a system audit', () => {
    expect(initialPremium).toMatchObject({
      key: 'premium',
      kind: 'PREMIUM',
      enabled: true,
      capabilities: [],
    });
    expect(initialAudits).toBe(1);
  });
  it('projects only stable access facts and never credentials or generic permissions', async () => {
    const group = await createGroup();
    await grant(group.id);
    expect(await repository.effectiveMemberships('subject', now)).toEqual([
      {
        key: 'guardians',
        kind: 'CUSTOM',
        capabilities: ['KNOWLEDGE_FORGE_GUARDIAN'],
      },
    ]);
    expect(Object.keys(group).sort()).toEqual(
      [
        'id',
        'key',
        'displayName',
        'kind',
        'enabled',
        'isPublic',
        'color',
        'badgeLabel',
        'icon',
        'createdAt',
        'updatedAt',
        'capabilities',
      ].sort(),
    );
    expect(await prisma.auditRecord.count()).toBe(2);
  });
  it('uses inclusive starts and exclusive expiry without worker cleanup', async () => {
    await grant((await createGroup()).id);
    expect(
      await repository.effectiveMemberships(
        'subject',
        new Date(now.getTime() - 1),
      ),
    ).toEqual([]);
    expect(await repository.effectiveMemberships('subject', now)).toHaveLength(
      1,
    );
    expect(
      await repository.effectiveMemberships(
        'subject',
        new Date(expiry.getTime() - 1),
      ),
    ).toHaveLength(1);
    expect(await repository.effectiveMemberships('subject', expiry)).toEqual(
      [],
    );
    expect(await repository.effectiveMemberships('missing', now)).toEqual([]);
  });
  it('preserves overlapping grants when only one is revoked and supports indefinite membership', async () => {
    const group = await createGroup();
    const first = await grant(group.id);
    const second = await grant(group.id, now, null);
    await repository.revoke(first!.id, 'manager', 'Remove one grant', now);
    expect(
      await repository.effectiveMemberships('subject', expiry),
    ).toHaveLength(1);
    await repository.revoke(
      second!.id,
      'manager',
      'Remove remaining grant',
      expiry,
    );
    expect(await repository.effectiveMemberships('subject', expiry)).toEqual(
      [],
    );
    expect(await prisma.accessGroupMembership.count()).toBe(2);
  });
  it('honors group disable immediately and refuses new grants while disabled', async () => {
    const group = await createGroup();
    await grant(group.id);
    await repository.update(group.id, { enabled: false }, 'manager');
    expect(await repository.effectiveMemberships('subject', now)).toEqual([]);
    expect(await grant(group.id)).toBeNull();
    await repository.update(group.id, { enabled: true }, 'manager');
    expect(await repository.effectiveMemberships('subject', now)).toHaveLength(
      1,
    );
  });
  it('rejects invalid intervals and missing-subject grants without partial audit', async () => {
    const group = await createGroup();
    await expect(grant(group.id, now, now)).rejects.toThrow();
    await expect(
      repository.grant(
        {
          groupId: group.id,
          subjectId: 'missing',
          validFrom: now,
          validUntil: null,
        },
        'manager',
      ),
    ).resolves.toBeNull();
    expect(await prisma.accessGroupMembership.count()).toBe(0);
    expect(await prisma.auditRecord.count()).toBe(1);
  });
  it('prevents Premium from receiving Guardian capabilities in the database', async () => {
    await expect(
      repository.setCapabilities(
        'premium',
        ['KNOWLEDGE_FORGE_GUARDIAN'],
        'manager',
      ),
    ).rejects.toThrow('Premium cannot grant delegated capabilities');
    expect((await repository.findById('premium'))!.capabilities).toEqual([]);
    expect(await prisma.auditRecord.count()).toBe(0);
    await expect(
      pool.query(
        'INSERT INTO access_group_capabilities ("groupId",key) VALUES ($1,$2)',
        ['premium', 'permissions.manage'],
      ),
    ).rejects.toThrow();
  });
  it('does not accept forged kind, permission IDs or display names as authority', async () => {
    const input = {
      key: 'ordinary',
      displayName: 'Premium',
      capabilities: [],
      kind: 'PREMIUM',
      permissionIds: ['admin'],
    };
    const group = await repository.create(input, 'manager');
    expect(group).toMatchObject({
      kind: 'CUSTOM',
      key: 'ordinary',
      capabilities: [],
    });
    await grant(group.id);
    expect(await repository.effectiveMemberships('subject', now)).toEqual([
      { key: 'ordinary', kind: 'CUSTOM', capabilities: [] },
    ]);
    await expect(
      repository.create(
        { key: 'premium', displayName: 'Forged', capabilities: [] },
        'manager',
      ),
    ).rejects.toThrow();
    await expect(
      prisma.accessGroup.update({
        where: { id: group.id },
        data: { kind: 'PREMIUM' },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.accessGroup.update({
        where: { id: group.id },
        data: { key: 'renamed' },
      }),
    ).rejects.toThrow();
  });
  it('keeps grant history and completed revocation immutable', async () => {
    const membership = await grant((await createGroup()).id);
    await expect(
      prisma.accessGroupMembership.update({
        where: { id: membership!.id },
        data: { validUntil: null },
      }),
    ).rejects.toThrow('Access membership grant is immutable');
    await expect(
      prisma.accessGroupMembership.delete({ where: { id: membership!.id } }),
    ).rejects.toThrow('Access membership history cannot be deleted');
    await expect(
      prisma.accessGroupMembership.update({
        where: { id: membership!.id },
        data: { revokedAt: now, revokedById: 'manager' },
      }),
    ).rejects.toThrow();
    const revoked = await repository.revoke(
      membership!.id,
      'manager',
      'Reason recorded',
      now,
    );
    await expect(
      prisma.accessGroupMembership.update({
        where: { id: membership!.id },
        data: { revokedAt: null, revokedById: null, revokeReason: null },
      }),
    ).rejects.toThrow('Access membership revocation is immutable');
    expect(
      await repository.revoke(
        membership!.id,
        'other',
        'Different reason',
        expiry,
      ),
    ).toEqual(revoked);
    expect(
      await prisma.auditRecord.count({
        where: { action: 'iam.access-membership.revoked' },
      }),
    ).toBe(1);
  });
  it('rolls group creation and audit back together', async () => {
    jest
      .spyOn(audit, 'append')
      .mockRejectedValueOnce(new Error('synthetic audit failure'));
    await expect(createGroup()).rejects.toThrow('synthetic audit failure');
    expect(
      await prisma.accessGroup.count({ where: { key: 'guardians' } }),
    ).toBe(0);
    expect(await prisma.accessGroupCapability.count()).toBe(0);
    expect(await prisma.auditRecord.count()).toBe(0);
  });
  it('rolls grants and revocations back on audit failure, allowing valid retry', async () => {
    const group = await createGroup();
    const spy = jest.spyOn(audit, 'append');
    spy.mockRejectedValueOnce(new Error('synthetic grant audit failure'));
    await expect(grant(group.id)).rejects.toThrow(
      'synthetic grant audit failure',
    );
    expect(await prisma.accessGroupMembership.count()).toBe(0);
    const membership = await grant(group.id);
    spy.mockRejectedValueOnce(new Error('synthetic revoke audit failure'));
    await expect(
      repository.revoke(membership!.id, 'manager', 'Denied audit', now),
    ).rejects.toThrow('synthetic revoke audit failure');
    expect(await repository.effectiveMemberships('subject', now)).toHaveLength(
      1,
    );
    await repository.revoke(membership!.id, 'manager', 'Valid retry', now);
    expect(await repository.effectiveMemberships('subject', now)).toEqual([]);
  });
  it('rolls display/enable and capability changes back on audit failure', async () => {
    const group = await createGroup();
    const spy = jest.spyOn(audit, 'append');
    spy.mockRejectedValueOnce(new Error('synthetic update audit failure'));
    await expect(
      repository.update(
        group.id,
        { enabled: false, displayName: 'Changed' },
        'manager',
      ),
    ).rejects.toThrow();
    expect(await repository.findById(group.id)).toEqual(group);
    spy.mockRejectedValueOnce(new Error('synthetic capability audit failure'));
    await expect(
      repository.setCapabilities(group.id, [], 'manager'),
    ).rejects.toThrow();
    expect((await repository.findById(group.id))!.capabilities).toEqual([
      'KNOWLEDGE_FORGE_GUARDIAN',
    ]);
  });
  it('serializes two competing revocations with observed PostgreSQL lock barriers', async () => {
    const membership = await grant((await createGroup()).id);
    const blocker = await admin.connect();
    let unlocked = false;
    try {
      await blocker.query('BEGIN');
      await blocker.query(
        `SELECT id FROM "${schema}".access_group_memberships WHERE id=$1 FOR UPDATE`,
        [membership!.id],
      );
      const revocations = Promise.all([
        repository.revoke(membership!.id, 'manager', 'First reason', now),
        repository.revoke(membership!.id, 'manager', 'Second reason', now),
      ]);
      let blocked = 0;
      for (let attempt = 0; attempt < 100; attempt++) {
        const rows = await admin.query<{ count: number }>(
          "SELECT COUNT(*)::int AS count FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock'",
          [schema],
        );
        blocked = rows.rows[0].count;
        if (blocked === 2) break;
        await new Promise((done) => setTimeout(done, 20));
      }
      expect(blocked).toBe(2);
      await blocker.query('COMMIT');
      unlocked = true;
      const [first, second] = await revocations;
      expect(first).toEqual(second);
      expect(
        await prisma.auditRecord.count({
          where: { action: 'iam.access-membership.revoked' },
        }),
      ).toBe(1);
    } finally {
      if (!unlocked) await blocker.query('ROLLBACK');
      blocker.release();
    }
  }, 10000);
  it('projects public appearance only, independently of hidden authority', async () => {
    const group = await createGroup();
    await grant(group.id);
    await repository.update(
      group.id,
      { color: '#aabbcc', badgeLabel: 'Pilot', icon: 'rocket' },
      'manager',
    );
    expect(await repository.publicGroups('subject', now)).toEqual([
      {
        key: 'guardians',
        displayName: 'Guardians',
        color: '#aabbcc',
        badgeLabel: 'Pilot',
        icon: 'rocket',
      },
    ]);
    await repository.update(group.id, { isPublic: false }, 'manager');
    expect(await repository.publicGroups('subject', now)).toEqual([]);
    expect(await repository.effectiveMemberships('subject', now)).toHaveLength(
      1,
    );
    await repository.update(group.id, { isPublic: true }, 'manager');
    expect(await repository.publicGroups('subject', expiry)).toEqual([]);
  });
  it('returns missing results without writing audit records', async () => {
    expect(await repository.findById('missing')).toBeNull();
    expect(
      await repository.update('missing', { enabled: false }, 'manager'),
    ).toBeNull();
    expect(
      await repository.setCapabilities('missing', [], 'manager'),
    ).toBeNull();
    expect(
      await repository.grant(
        {
          groupId: 'missing',
          subjectId: 'subject',
          validFrom: now,
          validUntil: null,
        },
        'manager',
      ),
    ).toBeNull();
    expect(
      await repository.revoke('missing', 'manager', 'Not found', now),
    ).toBeNull();
    expect(await prisma.auditRecord.count()).toBe(0);
  });
});
