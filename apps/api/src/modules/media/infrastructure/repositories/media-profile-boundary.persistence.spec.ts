/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Tests
 * 📄 File: apps/api/src/modules/media/infrastructure/repositories/media-profile-boundary.persistence.spec.ts
 *
 * 🎯 Purpose:
 * Characterizes profile-bound asset protection against real PostgreSQL.
 *
 * 🧠 Responsibilities:
 * • isolates fixtures in a random schema cloned from migrated tables;
 * • verifies orphan reads, cleanup claims and audit rollback.
 *
 * 🏗️ Architecture:
 * Opt-in infrastructure tests exercising the real root-composed Media port.
 *
 * ⚠️ Important:
 * Only this suite's schema is dropped. This is not a concurrent-attachment proof.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { AuditRedactionService } from '@api/core/audit/services/audit-redaction.service';
import { PrismaMediaRepository } from './prisma-media.repository';
import { PrismaProfileAwareMediaLibrary } from '@api/composition/media-library/infrastructure/prisma-profile-aware-media-library';

const dbSuite = process.env.RUN_IAM_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('Media profile-asset PostgreSQL characterization', () => {
  const schema = `media_profile_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaService({ adapter: new PrismaPg(pool, { schema }) });
  const audit = new AuditWriterService(new AuditRedactionService());
  const repository = new PrismaMediaRepository(
    prisma,
    audit,
    new PrismaProfileAwareMediaLibrary(prisma, audit),
  );
  const cutoff = new Date('2026-01-01T00:00:00Z');

  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    for (const type of [
      'MediaKind',
      'MediaStatus',
      'MediaVisibility',
      'MediaStorageProvider',
      'AuditActorType',
      'AuditResult',
    ]) {
      const definition = await admin.query<{ ddl: string }>(
        `SELECT format('CREATE TYPE %I.%I AS ENUM (%s)', $1::text, $2::text,
         string_agg(quote_literal(e.enumlabel), ',' ORDER BY e.enumsortorder)) AS ddl
         FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
         JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname=$2`,
        [schema, type],
      );
      await admin.query(definition.rows[0].ddl);
    }
    for (const table of [
      'users',
      'media',
      'media_variants',
      'media_references',
      'audit_records',
    ]) {
      await pool.query(
        `CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`,
      );
    }
    for (const [table, column, type, defaultValue] of [
      ['media', 'kind', 'MediaKind', null],
      ['media', 'status', 'MediaStatus', 'PENDING'],
      ['media', 'visibility', 'MediaVisibility', 'PRIVATE'],
      ['media', 'storageProvider', 'MediaStorageProvider', 'LOCAL'],
      ['media_variants', 'storageProvider', 'MediaStorageProvider', null],
      ['audit_records', 'actorType', 'AuditActorType', null],
      ['audit_records', 'result', 'AuditResult', 'SUCCESS'],
    ]) {
      await pool.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`,
      );
      await pool.query(
        `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE "${schema}"."${type}" USING "${column}"::text::"${schema}"."${type}"`,
      );
      if (defaultValue)
        await pool.query(
          `ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT '${defaultValue}'`,
        );
    }
    await pool.query(
      'ALTER TABLE users ADD FOREIGN KEY ("avatarMediaId") REFERENCES media(id), ADD FOREIGN KEY ("coverMediaId") REFERENCES media(id)',
    );
    await pool.query(
      'ALTER TABLE media_references ADD FOREIGN KEY ("mediaId") REFERENCES media(id)',
    );
    await pool.query(
      'ALTER TABLE media_variants ADD FOREIGN KEY ("mediaId") REFERENCES media(id)',
    );
  });
  beforeEach(async () => {
    await pool.query(
      'TRUNCATE users, media, media_variants, media_references, audit_records',
    );
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  async function asset(
    status:
      | 'READY'
      | 'FAILED'
      | 'REJECTED'
      | 'DELETING'
      | 'DELETED'
      | 'PENDING'
      | 'PROCESSING'
      | 'QUARANTINED' = 'READY',
    createdAt = new Date('2025-01-01T00:00:00Z'),
  ) {
    return prisma.media.create({
      data: {
        kind: 'IMAGE',
        status,
        storageProvider: 'LOCAL',
        bucket: 'test',
        storageKey: randomUUID(),
        originalFilename: 'fixture.png',
        mimeType: 'image/png',
        extension: 'png',
        size: 10,
        checksum: 'fixture',
        createdAt,
      },
    });
  }
  async function profile(avatarMediaId?: string, coverMediaId?: string) {
    const id = randomUUID();
    await pool.query(
      'INSERT INTO users (id,email,username,"passwordHash","displayName","createdAt","updatedAt","avatarMediaId","coverMediaId") VALUES ($1,$2,$1,$3,$4,NOW(),NOW(),$5,$6)',
      [
        id,
        `${id}@dss.test`,
        'synthetic-hash',
        'Fixture',
        avatarMediaId ?? null,
        coverMediaId ?? null,
      ],
    );
  }
  async function reference(mediaId: string, removedAt: Date | null) {
    await prisma.mediaReference.create({
      data: {
        mediaId,
        targetType: 'fixture',
        targetId: randomUUID(),
        purpose: 'fixture',
        removedAt,
      },
    });
  }

  it('excludes avatar, cover and active references but retains removed references', async () => {
    const [free, avatar, cover, active, removed] = await Promise.all(
      Array.from({ length: 5 }, () => asset()),
    );
    await profile(avatar.id, cover.id);
    await reference(active.id, null);
    await reference(removed.id, cutoff);
    const browse = await repository.browseLibrary({
      first: 20,
      orphaned: true,
    });
    expect(browse.items.map(({ id }) => id).sort()).toEqual(
      [free.id, removed.id].sort(),
    );
    expect((await repository.getLibraryMetrics()).orphanedMedia).toBe(2);
    const claimed = await repository.claimCleanupCandidates(cutoff, 20);
    expect(claimed.map(({ mediaId }) => mediaId).sort()).toEqual(
      [free.id, removed.id].sort(),
    );
    expect(await prisma.auditRecord.count()).toBe(2);
    for (const protectedId of [avatar.id, cover.id, active.id]) {
      expect(
        (await prisma.media.findUniqueOrThrow({ where: { id: protectedId } }))
          .status,
      ).toBe('READY');
    }
  });

  it('preserves strict age cutoff, status eligibility and DELETING recovery', async () => {
    const eligible = await Promise.all([
      asset('READY'),
      asset('FAILED'),
      asset('REJECTED'),
      asset('DELETING', new Date('2027-01-01T00:00:00Z')),
    ]);
    await Promise.all([
      asset('READY', cutoff),
      asset('PENDING'),
      asset('PROCESSING'),
      asset('QUARANTINED'),
      asset('DELETED'),
    ]);
    expect(
      (await repository.claimCleanupCandidates(cutoff, 20))
        .map(({ mediaId }) => mediaId)
        .sort(),
    ).toEqual(eligible.map(({ id }) => id).sort());
  });

  it('excludes deleted originals and their variants from byte metrics', async () => {
    const ready = await asset();
    const deleted = await asset('DELETED');
    for (const [mediaId, size] of [
      [ready.id, 7],
      [deleted.id, 99],
    ] as const) {
      await prisma.mediaVariant.create({
        data: {
          mediaId,
          name: 'thumb',
          storageProvider: 'LOCAL',
          bucket: 'test',
          storageKey: randomUUID(),
          mimeType: 'image/png',
          extension: 'png',
          size,
          checksum: 'fixture',
        },
      });
    }
    expect(await repository.getLibraryMetrics()).toEqual({
      totalMedia: 1,
      originalBytes: 10,
      variantBytes: 7,
      totalBytes: 17,
      orphanedMedia: 1,
      failedMedia: 0,
      quarantinedMedia: 0,
    });
  });

  it('rolls back an actual audit insert and claim when audit subsequently fails', async () => {
    const media = await asset();
    const failure = new Error('synthetic audit failure');
    const spy = jest
      .spyOn(audit, 'append')
      .mockImplementationOnce(async (tx, entry) => {
        await new AuditWriterService(new AuditRedactionService()).append(
          tx,
          entry,
        );
        throw failure;
      });
    try {
      await expect(
        repository.claimCleanupCandidates(cutoff, 1),
      ).rejects.toThrow(failure);
      expect(
        (await prisma.media.findUniqueOrThrow({ where: { id: media.id } }))
          .status,
      ).toBe('READY');
      expect(await prisma.auditRecord.count()).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it('honors selection limit without claiming newer candidates', async () => {
    const oldest = await asset('READY', new Date('2024-01-01T00:00:00Z'));
    const newer = await asset();
    expect(
      (await repository.claimCleanupCandidates(cutoff, 1)).map(
        ({ mediaId }) => mediaId,
      ),
    ).toEqual([oldest.id]);
    expect(
      (await prisma.media.findUniqueOrThrow({ where: { id: newer.id } }))
        .status,
    ).toBe('READY');
  });
});
