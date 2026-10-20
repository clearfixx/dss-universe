/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Root / Media Ownership Audit
 * 📄 File: apps/api/test/media-profile-cleanup-claim-audit.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Characterizes profile assignment interleavings with real Media cleanup claims.
 *
 * 🧠 Responsibilities:
 * • exercises real authenticated GraphQL avatar/cover mutations and migrated SQL;
 * • coordinates an observed PostgreSQL lock wait after the READY recheck;
 * • separates sequential controls from a possible stale-read schedule.
 *
 * 🏗️ Architecture:
 * Audit-only AppModule fixture; temporary triggers exist solely in its owned schema.
 *
 * ⚠️ Important:
 * A passing defect characterization is not acceptance. No access or SQL result is mocked.
 * No binary IO or production schema/timeout change is performed.
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
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../src/modules/media/domain/repositories/media.repository.interface';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
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

describe('Media cleanup / profile assignment schedule audit (e2e)', () => {
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
    const asset = await fixture.prisma.media.create({
      data: {
        ownerId: identity.user.id,
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
    return { identity, asset };
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
  async function installBarrier(mediaId: string, key: number) {
    if (
      !/^api_boundary_[a-f0-9]{32}$/.test(fixture.schema) ||
      !/^[a-f0-9-]{36}$/.test(mediaId) ||
      !Number.isSafeInteger(key)
    )
      throw new Error('Unexpected synthetic barrier coordinates.');
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
  async function removeBarrier() {
    await fixture.prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS pause_profile_reference ON "${fixture.schema}".media_references`,
    );
    await fixture.prisma.$executeRawUnsafe(
      `DROP FUNCTION IF EXISTS "${fixture.schema}".pause_profile_reference()`,
    );
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
    'characterizes stale %s assignment committing after cleanup claim',
    async (slot) => {
      const { identity, asset } = await seed();
      const key = randomInt(1, 2_000_000_000);
      const client = await controls.connect();
      let pending: Promise<Result> | undefined;
      let held = false;
      try {
        await installBarrier(asset.id, key);
        await client.query('SELECT pg_advisory_lock($1::bigint)', [key]);
        held = true;
        pending = assign(slot, identity.tokens.accessToken, asset.id);
        expect(await waitForReferenceBarrier(client, key)).toBe(true);
        const claimed = await media.claimCleanupCandidates(cutoff, 50);
        expect(claimed.map((item) => item.mediaId)).toContain(asset.id);
        expect(
          (
            await fixture.prisma.media.findUniqueOrThrow({
              where: { id: asset.id },
            })
          ).status,
        ).toBe('DELETING');
        await client.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
        held = false;
        const response = await pending;
        // Defect characterization: actual mutation success, not the intended lifecycle invariant.
        expect(response.errors).toBeUndefined();
        expect(binding(await profile(identity.user.id), slot)).toBe(asset.id);
        expect(
          await fixture.prisma.mediaReference.count({
            where: { mediaId: asset.id, removedAt: null },
          }),
        ).toBe(1);
        expect(
          (
            await fixture.prisma.media.findUniqueOrThrow({
              where: { id: asset.id },
            })
          ).status,
        ).toBe('DELETING');
        const variant = slot === 'AVATAR' ? 'avatar-256' : 'cover-1280';
        expect(await media.findPublicVariant(asset.id, variant)).toBeNull();
        // Exercise the real DB finalization step, not Storage IO or physical file deletion.
        await media.completeCleanup(asset.id);
        expect(
          (
            await fixture.prisma.media.findUniqueOrThrow({
              where: { id: asset.id },
            })
          ).status,
        ).toBe('DELETED');
        expect(binding(await profile(identity.user.id), slot)).toBe(asset.id);
        expect(
          await fixture.prisma.mediaReference.count({
            where: { mediaId: asset.id, removedAt: null },
          }),
        ).toBe(1);
      } finally {
        if (held)
          await client.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
        await pending?.catch(() => undefined);
        await removeBarrier();
        client.release();
      }
    },
  );
});
