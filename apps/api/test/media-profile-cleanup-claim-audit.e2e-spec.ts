/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Root / Media Cleanup Regression
 * 📄 File: apps/api/test/media-profile-cleanup-claim-audit.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies profile assignment interleavings with real Media cleanup claims.
 *
 * 🧠 Responsibilities:
 * • exercises real authenticated GraphQL avatar/cover mutations and migrated SQL;
 * • coordinates an observed PostgreSQL lock wait after the READY recheck;
 * • separates sequential controls from a possible stale-read schedule.
 *
 * 🏗️ Architecture:
 * Real AppModule regression fixture; temporary triggers exist only in its owned schema.
 *
 * ⚠️ Important:
 * No access or SQL result is mocked; the historical vulnerable schedule is now denied.
 * Storage deletion is observed with a test IO stub; no physical files are deleted.
 * No production schema/timeout change is performed.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomInt, randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '@api/core/database';
import { StorageService } from '@api/core/storage';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../src/modules/media/domain/repositories/media.repository.interface';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { MediaRetentionService } from '../src/modules/media/application/services/media-retention.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type Slot = 'AVATAR' | 'COVER';
type Result = {
  errors?: { message: string }[];
  data: Record<
    string,
    { id: string; avatarUrl: string | null; coverUrl: string | null }
  > | null;
};
const cutoff = new Date('2025-01-01');

describe('Media cleanup / profile assignment serialization (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication<App>;
  let media: MediaRepository;
  let controls: Pool;
  const presenceWrites: Promise<void>[] = [];

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    media = app.get<MediaRepository>(MEDIA_REPOSITORY);
    controls = new Pool({ connectionString: process.env.DATABASE_URL });
  }, 60000);
  beforeEach(() => {
    const presence = app.get(UserPresenceService);
    const touch = presence.touch.bind(presence) as UserPresenceService['touch'];
    jest.spyOn(presence, 'touch').mockImplementation((...args) => {
      const pending = touch(...args);
      presenceWrites.push(pending);
      return pending;
    });
  });
  afterEach(async () => {
    try {
      await Promise.all(presenceWrites.splice(0));
    } finally {
      jest.restoreAllMocks();
    }
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await controls?.end();
      await fixture?.close();
    }
  });

  async function seed() {
    const id = randomUUID();
    const identity = await app.get(AuthenticationPresentationService).register({
      username: `claim-${id}`,
      email: `${id}@dss.test`,
      password: 'synthetic-cleanup-password-123',
    });
    const asset = await createAsset(identity.user.id);
    return { identity, asset };
  }
  async function createAsset(ownerId: string) {
    const id = randomUUID();
    return fixture.prisma.media.create({
      data: {
        ownerId,
        kind: 'IMAGE',
        status: 'READY',
        visibility: 'PUBLIC',
        storageProvider: 'LOCAL',
        bucket: 'audit-fixture',
        storageKey: id,
        originalFilename: 'synthetic.webp',
        mimeType: 'image/webp',
        extension: 'webp',
        size: 100,
        checksum: id,
        createdAt: new Date('2020-01-01'),
        variants: {
          create: ['avatar-256', 'cover-1280'].map((name) => ({
            name,
            storageProvider: 'LOCAL' as const,
            bucket: 'audit-fixture',
            storageKey: `${id}/${name}`,
            mimeType: 'image/webp',
            extension: 'webp',
            size: 100,
            checksum: id,
          })),
        },
      },
    });
  }
  async function assign(
    slot: Slot,
    token: string,
    mediaId: string,
  ): Promise<Result> {
    const mutation = slot === 'AVATAR' ? 'setViewerAvatar' : 'setViewerCover';
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: `mutation($id:ID!){${mutation}(mediaId:$id){id avatarUrl coverUrl}}`,
        variables: { id: mediaId },
      })
      .expect(200);
    return response.body as Result;
  }
  async function profile(userId: string) {
    return fixture.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { avatarMediaId: true, coverMediaId: true },
    });
  }
  function binding(record: Awaited<ReturnType<typeof profile>>, slot: Slot) {
    return slot === 'AVATAR' ? record.avatarMediaId : record.coverMediaId;
  }
  async function waitForReferenceBarrier(
    client: PoolClient,
    key: number,
  ): Promise<boolean> {
    const until = Date.now() + 2000;
    while (Date.now() < until) {
      const result = await client.query<{ waiting: boolean }>(
        `SELECT EXISTS (
        SELECT 1 FROM pg_locks WHERE locktype='advisory' AND NOT granted
          AND classid=0 AND objid=$1::oid AND objsubid=1
      ) AS waiting`,
        [key],
      );
      if (result.rows[0].waiting) return true;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    return false;
  }
  function validateCoordinates(mediaId: string, key: number) {
    if (
      !/^api_boundary_[a-f0-9]{32}$/.test(fixture.schema) ||
      !/^[a-f0-9-]{36}$/.test(mediaId) ||
      !Number.isSafeInteger(key)
    )
      throw new Error('Unexpected synthetic barrier coordinates.');
  }
  async function installBarrier(mediaId: string, key: number) {
    validateCoordinates(mediaId, key);
    await fixture.prisma
      .$executeRawUnsafe(`CREATE FUNCTION "${fixture.schema}".pause_profile_reference() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."mediaId" = '${mediaId}' AND NEW.purpose IN ('avatar','cover') THEN
          PERFORM pg_advisory_xact_lock(${key}::bigint);
        END IF;
        RETURN NEW;
      END;
    $$`);
    await fixture.prisma.$executeRawUnsafe(
      `CREATE TRIGGER pause_profile_reference BEFORE INSERT ON "${fixture.schema}".media_references FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".pause_profile_reference()`,
    );
  }
  async function waiterPid(key: number) {
    const result = await controls.query<{ pid: number }>(
      `SELECT pid FROM pg_locks WHERE locktype='advisory' AND NOT granted
         AND classid=0 AND objid=$1::oid AND objsubid=1`,
      [key],
    );
    expect(result.rows).toHaveLength(1);
    return result.rows[0].pid;
  }
  async function waitForBlockedTransaction(blockerPid: number) {
    const until = Date.now() + 2000;
    while (Date.now() < until) {
      const result = await controls.query<{ waiting: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM pg_stat_activity
          WHERE datname=current_database() AND state='active'
          AND $1::int=ANY(pg_blocking_pids(pid))) AS waiting`,
        [blockerPid],
      );
      if (result.rows[0].waiting) return true;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    return false;
  }
  async function removeBarrier() {
    await fixture.prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS pause_profile_reference ON "${fixture.schema}".media_references`,
    );
    await fixture.prisma.$executeRawUnsafe(
      `DROP FUNCTION IF EXISTS "${fixture.schema}".pause_profile_reference()`,
    );
  }
  async function installCleanupBarrier(mediaId: string, key: number) {
    validateCoordinates(mediaId, key);
    await fixture.prisma
      .$executeRawUnsafe(`CREATE FUNCTION "${fixture.schema}".pause_cleanup_claim() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.id = '${mediaId}' AND NEW.status = 'DELETING' THEN
          PERFORM pg_advisory_xact_lock(${key}::bigint);
        END IF;
        RETURN NEW;
      END;
    $$`);
    await fixture.prisma.$executeRawUnsafe(
      `CREATE TRIGGER pause_cleanup_claim AFTER UPDATE ON "${fixture.schema}".media FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".pause_cleanup_claim()`,
    );
  }
  async function removeCleanupBarrier() {
    await fixture.prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS pause_cleanup_claim ON "${fixture.schema}".media`,
    );
    await fixture.prisma.$executeRawUnsafe(
      `DROP FUNCTION IF EXISTS "${fixture.schema}".pause_cleanup_claim()`,
    );
  }
  async function installAuditFailure(userId: string, slot: Slot) {
    validateCoordinates(userId, 1);
    const purpose = slot === 'AVATAR' ? 'avatar' : 'cover';
    await fixture.prisma
      .$executeRawUnsafe(`CREATE FUNCTION "${fixture.schema}".fail_profile_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."targetId" = '${userId}' AND NEW.action = 'user.${purpose}.assigned' THEN
          RAISE EXCEPTION 'synthetic profile audit failure';
        END IF;
        RETURN NEW;
      END;
    $$`);
    await fixture.prisma.$executeRawUnsafe(
      `CREATE TRIGGER fail_profile_audit BEFORE INSERT ON "${fixture.schema}".audit_records FOR EACH ROW EXECUTE FUNCTION "${fixture.schema}".fail_profile_audit()`,
    );
  }
  async function removeAuditFailure() {
    await fixture.prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS fail_profile_audit ON "${fixture.schema}".audit_records`,
    );
    await fixture.prisma.$executeRawUnsafe(
      `DROP FUNCTION IF EXISTS "${fixture.schema}".fail_profile_audit()`,
    );
  }
  async function activeReferences(mediaId: string) {
    return fixture.prisma.mediaReference.count({
      where: { mediaId, removedAt: null },
    });
  }
  async function assignmentAudits(userId: string, slot: Slot) {
    return fixture.prisma.auditRecord.count({
      where: {
        targetId: userId,
        action:
          slot === 'AVATAR' ? 'user.avatar.assigned' : 'user.cover.assigned',
      },
    });
  }

  it.each(['AVATAR', 'COVER'] as const)(
    'excludes an already committed %s binding from cleanup',
    async (slot) => {
      const { identity, asset } = await seed();
      expect(
        (await assign(slot, identity.tokens.accessToken, asset.id)).errors,
      ).toBeUndefined();
      expect(binding(await profile(identity.user.id), slot)).toBe(asset.id);
      const claimed = await media.claimCleanupCandidates(cutoff, 50);
      expect(claimed.map((item) => item.mediaId)).not.toContain(asset.id);
      expect(
        (
          await fixture.prisma.media.findUniqueOrThrow({
            where: { id: asset.id },
          })
        ).status,
      ).toBe('READY');
    },
  );
  it.each(['AVATAR', 'COVER'] as const)(
    'denies %s when cleanup committed before assignment began',
    async (slot) => {
      const { identity, asset } = await seed();
      expect(
        (await media.claimCleanupCandidates(cutoff, 50)).map(
          (item) => item.mediaId,
        ),
      ).toContain(asset.id);
      const response = await assign(
        slot,
        identity.tokens.accessToken,
        asset.id,
      );
      expect(response.errors).toBeDefined();
      expect(binding(await profile(identity.user.id), slot)).toBeNull();
      expect(
        await fixture.prisma.mediaReference.count({
          where: { mediaId: asset.id, removedAt: null },
        }),
      ).toBe(0);
      await media.completeCleanup(asset.id);
    },
  );
  it.each(['AVATAR', 'COVER'] as const)(
    'keeps %s READY and defers the stale cleanup after assignment wins',
    async (slot) => {
      const { identity, asset } = await seed();
      const key = randomInt(1, 2_000_000_000);
      const client = await controls.connect();
      let pending: Promise<Result> | undefined;
      let cleanup:
        | ReturnType<MediaRepository['claimCleanupCandidates']>
        | undefined;
      let held = false;
      try {
        await installBarrier(asset.id, key);
        await client.query('SELECT pg_advisory_lock($1::bigint)', [key]);
        held = true;
        pending = assign(slot, identity.tokens.accessToken, asset.id);
        expect(await waitForReferenceBarrier(client, key)).toBe(true);
        cleanup = media.claimCleanupCandidates(cutoff, 50);
        const observed = cleanup.then(
          (claims) => ({ claims }),
          (error: unknown) => ({ error }),
        );
        expect(await waitForBlockedTransaction(await waiterPid(key))).toBe(
          true,
        );
        await client.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
        held = false;
        const response = await pending;
        expect(response.errors).toBeUndefined();
        expect(await observed).toEqual({ claims: [] });
        expect(binding(await profile(identity.user.id), slot)).toBe(asset.id);
        expect(
          await fixture.prisma.mediaReference.count({
            where: { mediaId: asset.id, removedAt: null },
          }),
        ).toBe(1);
        expect(
          await fixture.prisma.media.findUniqueOrThrow({
            where: { id: asset.id },
          }),
        ).toEqual(asset);
        const variant = slot === 'AVATAR' ? 'avatar-256' : 'cover-1280';
        expect(await media.findPublicVariant(asset.id, variant)).not.toBeNull();
        expect(
          (await media.claimCleanupCandidates(cutoff, 50)).map(
            (item) => item.mediaId,
          ),
        ).not.toContain(asset.id);
      } finally {
        if (held)
          await client.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
        await pending?.catch(() => undefined);
        await cleanup?.catch(() => undefined);
        await removeBarrier();
        client.release();
      }
    },
  );
  it.each(['AVATAR', 'COVER'] as const)(
    'rechecks %s eligibility after waiting for the winning cleanup commit',
    async (slot) => {
      const { identity, asset } = await seed();
      const previous = await createAsset(identity.user.id);
      expect(
        (await assign(slot, identity.tokens.accessToken, previous.id)).errors,
      ).toBeUndefined();
      const key = randomInt(1, 2_000_000_000);
      const client = await controls.connect();
      let held = false;
      let pending: Promise<Result> | undefined;
      let cleanup:
        | ReturnType<MediaRepository['claimCleanupCandidates']>
        | undefined;
      try {
        await installCleanupBarrier(asset.id, key);
        await client.query('SELECT pg_advisory_lock($1::bigint)', [key]);
        held = true;
        cleanup = media.claimCleanupCandidates(cutoff, 50);
        const observed = cleanup.then(
          (claims) => ({ claims }),
          (error: unknown) => ({ error }),
        );
        expect(await waitForReferenceBarrier(client, key)).toBe(true);
        const cleanupPid = await waiterPid(key);
        pending = assign(slot, identity.tokens.accessToken, asset.id);
        expect(await waitForBlockedTransaction(cleanupPid)).toBe(true);
        await client.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
        held = false;
        const completed = await observed;
        if ('error' in completed) throw completed.error;
        expect(completed.claims.map((item) => item.mediaId)).toContain(
          asset.id,
        );
        const response = await pending;
        expect(response.errors?.[0].message).toBe(
          `${slot === 'AVATAR' ? 'Avatar' : 'Cover'} media changed before it could be assigned.`,
        );
        expect(binding(await profile(identity.user.id), slot)).toBe(
          previous.id,
        );
        expect(await activeReferences(previous.id)).toBe(1);
        expect(await activeReferences(asset.id)).toBe(0);
        expect(await assignmentAudits(identity.user.id, slot)).toBe(1);
        await media.completeCleanup(asset.id);
      } finally {
        if (held)
          await client.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
        await pending?.catch(() => undefined);
        await cleanup?.catch(() => undefined);
        await removeCleanupBarrier();
        client.release();
      }
    },
  );
  it.each(['AVATAR', 'COVER'] as const)(
    'rolls back %s reference/profile/guard when the actual Audit insert fails',
    async (slot) => {
      const { identity, asset } = await seed();
      const previous = await createAsset(identity.user.id);
      expect(
        (await assign(slot, identity.tokens.accessToken, previous.id)).errors,
      ).toBeUndefined();
      const key = randomInt(1, 2_000_000_000);
      const client = await controls.connect();
      let held = false;
      let pending: Promise<Result> | undefined;
      let cleanup:
        | ReturnType<MediaRepository['claimCleanupCandidates']>
        | undefined;
      try {
        await installBarrier(asset.id, key);
        await installAuditFailure(identity.user.id, slot);
        await client.query('SELECT pg_advisory_lock($1::bigint)', [key]);
        held = true;
        pending = assign(slot, identity.tokens.accessToken, asset.id);
        expect(await waitForReferenceBarrier(client, key)).toBe(true);
        cleanup = media.claimCleanupCandidates(cutoff, 50);
        const observed = cleanup.then(
          (claims) => ({ claims }),
          (error: unknown) => ({ error }),
        );
        expect(await waitForBlockedTransaction(await waiterPid(key))).toBe(
          true,
        );
        await client.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
        held = false;
        expect((await pending).errors).toBeDefined();
        const completed = await observed;
        if ('error' in completed) throw completed.error;
        expect(completed.claims.map((item) => item.mediaId)).toContain(
          asset.id,
        );
        expect(binding(await profile(identity.user.id), slot)).toBe(
          previous.id,
        );
        expect(await activeReferences(previous.id)).toBe(1);
        expect(await activeReferences(asset.id)).toBe(0);
        expect(await assignmentAudits(identity.user.id, slot)).toBe(1);
        await media.completeCleanup(asset.id);
      } finally {
        if (held)
          await client.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
        await pending?.catch(() => undefined);
        await cleanup?.catch(() => undefined);
        await removeBarrier();
        await removeAuditFailure();
        client.release();
      }
    },
  );
  it.each(['AVATAR', 'COVER'] as const)(
    'does no storage deletion for a rolled-back batch and makes fresh progress after %s wins',
    async (slot) => {
      const { identity, asset } = await seed();
      const unrelated = await createAsset(identity.user.id);
      await fixture.prisma.media.update({
        where: { id: unrelated.id },
        data: { createdAt: new Date('2019-01-01') },
      });
      const deleted: string[] = [];
      jest
        .spyOn(app.get(StorageService), 'delete')
        .mockImplementation((key) => {
          deleted.push(key);
          return Promise.resolve();
        });
      const retention = app.get(MediaRetentionService);
      const now = new Date('2025-06-01');
      const key = randomInt(1, 2_000_000_000);
      const client = await controls.connect();
      let held = false;
      let pending: Promise<Result> | undefined;
      let cleanup: Promise<number> | undefined;
      try {
        await installBarrier(asset.id, key);
        await client.query('SELECT pg_advisory_lock($1::bigint)', [key]);
        held = true;
        pending = assign(slot, identity.tokens.accessToken, asset.id);
        expect(await waitForReferenceBarrier(client, key)).toBe(true);
        cleanup = retention.runOnce(now);
        const observed = cleanup.then(
          (completed) => ({ completed }),
          (error: unknown) => ({ error }),
        );
        expect(await waitForBlockedTransaction(await waiterPid(key))).toBe(
          true,
        );
        await client.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
        held = false;
        expect((await pending).errors).toBeUndefined();
        expect(await observed).toEqual({ completed: 0 });
        expect(deleted).toEqual([]);
        expect(
          (
            await fixture.prisma.media.findUniqueOrThrow({
              where: { id: unrelated.id },
            })
          ).status,
        ).toBe('READY');
        expect(
          await fixture.prisma.auditRecord.count({
            where: { targetId: unrelated.id, action: 'media.cleanup.claimed' },
          }),
        ).toBe(0);
        expect(await retention.runOnce(now)).toBe(1);
        expect(deleted.sort()).toEqual(
          [
            unrelated.storageKey,
            `${unrelated.storageKey}/avatar-256`,
            `${unrelated.storageKey}/cover-1280`,
          ].sort(),
        );
        expect(
          (
            await fixture.prisma.media.findUniqueOrThrow({
              where: { id: unrelated.id },
            })
          ).status,
        ).toBe('DELETED');
        expect(
          await fixture.prisma.auditRecord.count({
            where: { targetId: unrelated.id, action: 'media.cleanup.claimed' },
          }),
        ).toBe(1);
        expect(
          await fixture.prisma.auditRecord.count({
            where: {
              targetId: unrelated.id,
              action: 'media.cleanup.completed',
            },
          }),
        ).toBe(1);
        expect(
          await fixture.prisma.media.findUniqueOrThrow({
            where: { id: asset.id },
          }),
        ).toEqual(asset);
        expect(binding(await profile(identity.user.id), slot)).toBe(asset.id);
      } finally {
        if (held)
          await client.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
        await pending?.catch(() => undefined);
        await cleanup?.catch(() => undefined);
        await removeBarrier();
        client.release();
      }
    },
  );
});
