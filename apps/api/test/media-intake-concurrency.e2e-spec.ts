/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Intake Regression
 * 📄 File: apps/api/test/media-intake-concurrency.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies exclusive multipart intake against real owner persistence and IO.
 *
 * 🧠 Responsibilities:
 * • exercises authenticated HTTP with real sessions and a migrated private schema;
 * • releases two actual INITIATED reads together without replacing their results;
 * • observes physical bytes, Media rows and a private real BullMQ queue.
 *
 * 🏗️ Architecture:
 * AppModule test fixture; queue forwarding isolates publication from other workers.
 *
 * ⚠️ Important:
 * The claim loser must not compensate or mutate the successful intake.
 * No Worker/scanner runs; READY, quarantine bypass and data leakage are not proved.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';
import type { MediaProcessingJob } from '@dss/jobs';
import { PrismaService } from '@api/core/database';
import { QueueRegistryService } from '@api/core/queue';
import { StorageService } from '@api/core/storage';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { MediaUploadSessionService } from '../src/modules/media/application/services/media-upload-session.service';
import { MediaUploadStatus } from '../src/modules/media/domain/enums/media-upload-status.enum';
import {
  MEDIA_UPLOAD_SESSION_REPOSITORY,
  type MediaUploadSessionRepository,
} from '../src/modules/media/domain/repositories/media-upload-session.repository.interface';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8uoAAAAASUVORK5CYII=',
  'base64',
);

describe('Media concurrent binary intake serialization (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication<App>;
  let queue: Queue<MediaProcessingJob>;
  let registry: QueueRegistryService;
  let publication: jest.SpiedFunction<
    QueueRegistryService['mediaProcessing']['add']
  >;
  let removal: jest.SpiedFunction<
    QueueRegistryService['mediaProcessing']['remove']
  >;
  let sessions: MediaUploadSessionService;
  let ownerId: string;
  let accessToken: string;
  let uploadsRoot: string;
  let releaseReads: (() => void) | undefined;
  let releaseStorage: (() => void) | undefined;
  const presenceWrites: Promise<void>[] = [];
  const requests: Promise<Response>[] = [];

  beforeAll(async () => {
    if (
      process.env.REDIS_HOST !== '127.0.0.1' ||
      process.env.REDIS_PORT !== '6380'
    )
      throw new Error('Expected disposable loopback Redis on port 6380.');
    fixture = await createIsolatedApiSchemaFixture();
    const cache = resolve(process.cwd(), 'node_modules/.cache');
    await mkdir(cache, { recursive: true });
    uploadsRoot = await mkdtemp(resolve(cache, 'media-intake-'));
    const previousRoot = process.env.DSS_UPLOADS_DIR;
    process.env.DSS_UPLOADS_DIR = uploadsRoot;
    try {
      const module = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PrismaService)
        .useValue(fixture.prisma)
        .compile();
      app = module.createNestApplication();
      app.setGlobalPrefix('api');
      await app.init();
    } finally {
      if (previousRoot === undefined) delete process.env.DSS_UPLOADS_DIR;
      else process.env.DSS_UPLOADS_DIR = previousRoot;
    }
    registry = app.get(QueueRegistryService);
    sessions = app.get(MediaUploadSessionService);
    queue = new Queue<MediaProcessingJob>(`media-intake-${randomUUID()}`, {
      connection: { host: '127.0.0.1', port: 6380 },
    });
    await queue.waitUntilReady();
    const id = randomUUID();
    const identity = await app.get(AuthenticationPresentationService).register({
      username: `intake-${id}`,
      email: `${id}@dss.test`,
      password: 'synthetic-intake-password-123',
    });
    ownerId = identity.user.id;
    accessToken = identity.tokens.accessToken;
  }, 60000);

  beforeEach(() => {
    publication = jest
      .spyOn(registry.mediaProcessing, 'add')
      .mockImplementation((name, data, options) =>
        queue.add(name, data, options),
      );
    removal = jest
      .spyOn(registry.mediaProcessing, 'remove')
      .mockImplementation((id, options) => queue.remove(id, options));
    const presence = app.get(UserPresenceService);
    const touch = presence.touch.bind(presence) as UserPresenceService['touch'];
    jest.spyOn(presence, 'touch').mockImplementation((...args) => {
      const pending = touch(...args);
      presenceWrites.push(pending);
      return pending;
    });
  });

  afterEach(async () => {
    releaseReads?.();
    releaseStorage?.();
    releaseReads = undefined;
    releaseStorage = undefined;
    try {
      await Promise.allSettled(requests.splice(0));
      await Promise.all(presenceWrites.splice(0));
    } finally {
      jest.restoreAllMocks();
    }
  });

  afterAll(async () => {
    try {
      if (queue) {
        try {
          await queue.obliterate();
        } finally {
          await queue.close();
        }
      }
    } finally {
      try {
        await app?.close();
      } finally {
        await fixture?.close();
        await cleanupUploads();
      }
    }
  });

  async function cleanupUploads() {
    if (!uploadsRoot) return;
    if (
      dirname(uploadsRoot) !== resolve(process.cwd(), 'node_modules/.cache') ||
      !basename(uploadsRoot).startsWith('media-intake-')
    )
      throw new Error('Unexpected synthetic upload directory.');
    await rm(uploadsRoot, { recursive: true, force: true });
  }

  function initiate() {
    return sessions.initiate(ownerId, {
      policyKey: 'avatar',
      originalFilename: 'synthetic.png',
      declaredMimeType: 'image/png',
      declaredSize: PNG.length,
    });
  }

  function upload(sessionId: string, token = accessToken) {
    const pending = request(app.getHttpServer())
      .put(`/api/media/uploads/${sessionId}/content`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG, {
        filename: 'synthetic.png',
        contentType: 'image/png',
      })
      .then((response) => response);
    requests.push(pending);
    return pending;
  }

  it('accepts once, then rejects a sequential repeat without another Media row', async () => {
    const session = await initiate();
    expect((await upload(session.id)).status).toBe(200);
    expect((await upload(session.id)).status).toBe(409);
    const completed = await sessions.findOwned(ownerId, session.id);
    expect(completed.status).toBe(MediaUploadStatus.COMPLETED);
    expect(publication).toHaveBeenCalledTimes(1);
    expect(await queue.getJob(session.id)).not.toBeUndefined();
    expect(
      await fixture.prisma.media.count({
        where: { metadata: { path: ['uploadSessionId'], equals: session.id } },
      }),
    ).toBe(1);
    await expect(
      app.get(StorageService).read(session.temporaryKey),
    ).resolves.toEqual(PNG);
  });

  it('rejects an invalid JWT before changing an INITIATED session', async () => {
    const session = await initiate();
    expect((await upload(session.id, 'invalid-intake-token')).status).toBe(401);
    expect((await sessions.findOwned(ownerId, session.id)).status).toBe(
      MediaUploadStatus.INITIATED,
    );
    expect(publication).not.toHaveBeenCalled();
    expect(await queue.getJob(session.id)).toBeUndefined();
  });

  function synchronizeInitialReads(sessionId: string) {
    const repository = app.get<MediaUploadSessionRepository>(
      MEDIA_UPLOAD_SESSION_REPOSITORY,
    );
    const read = repository.findById.bind(
      repository,
    ) as MediaUploadSessionRepository['findById'];
    let reads = 0;
    const barrier = new Promise<void>((release) => {
      releaseReads = release;
    });
    const readSpy = jest
      .spyOn(repository, 'findById')
      .mockImplementation(async (id) => {
        const snapshot = await read(id);
        if (id === sessionId) {
          expect(snapshot?.status).toBe(MediaUploadStatus.INITIATED);
          reads += 1;
          if (reads === 2) releaseReads?.();
          await barrier;
        }
        return snapshot;
      });
    return {
      get readCount() {
        return reads;
      },
      restore: () => readSpy.mockRestore(),
    };
  }

  it('accepts only one of two INITIATED snapshots and queues exactly its Media row', async () => {
    const session = await initiate();
    const barrier = synchronizeInitialReads(session.id);
    const responses = await Promise.all([
      upload(session.id),
      upload(session.id),
    ]);
    barrier.restore();
    expect(barrier.readCount).toBe(2);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(
      responses.find((response) => response.status === 200)?.body,
    ).toMatchObject({
      id: session.id,
      status: MediaUploadStatus.COMPLETED,
    });
    for (const response of responses) {
      expect(response.body).not.toHaveProperty('temporaryKey');
    }
    const records = await fixture.prisma.media.findMany({
      where: { metadata: { path: ['uploadSessionId'], equals: session.id } },
    });
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe('PROCESSING');
    expect(publication).toHaveBeenCalledTimes(1);
    expect(removal).not.toHaveBeenCalled();
    const job = await queue.getJob(session.id);
    expect(job).toBeDefined();
    expect(job?.data.mediaId).toBe(records[0].id);
    const jobs = await queue.getJobs(['wait', 'active', 'delayed']);
    expect(
      jobs.filter((candidate) => candidate.id === session.id),
    ).toHaveLength(1);
    const completed = await sessions.findOwned(ownerId, session.id);
    expect(completed.status).toBe(MediaUploadStatus.COMPLETED);
    expect(completed.metadata?.mediaId).toBe(records[0].id);
    await expect(
      app.get(StorageService).read(session.temporaryKey),
    ).resolves.toEqual(PNG);
  });

  it('returns the losing conflict while the winner retains its session and physical bytes', async () => {
    const session = await initiate();
    const barrier = synchronizeInitialReads(session.id);
    const storage = app.get(StorageService);
    const save = storage.save.bind(storage) as StorageService['save'];
    let signalStored: () => void = () => undefined;
    const stored = new Promise<void>((release) => {
      signalStored = release;
    });
    const resume = new Promise<void>((release) => {
      releaseStorage = release;
    });
    const saving = jest
      .spyOn(storage, 'save')
      .mockImplementation(async (input) => {
        const result = await save(input);
        signalStored();
        await resume;
        return result;
      });
    const deleting = jest.spyOn(storage, 'delete');
    const pending = [upload(session.id), upload(session.id)];
    await stored;
    barrier.restore();
    const loser = await Promise.race(pending);
    expect(loser.status).toBe(409);
    expect(barrier.readCount).toBe(2);
    expect(saving).toHaveBeenCalledTimes(1);
    expect(deleting).not.toHaveBeenCalled();
    expect(publication).not.toHaveBeenCalled();
    expect(removal).not.toHaveBeenCalled();
    expect((await sessions.findOwned(ownerId, session.id)).status).toBe(
      MediaUploadStatus.UPLOADING,
    );
    expect(
      await fixture.prisma.media.count({
        where: { metadata: { path: ['uploadSessionId'], equals: session.id } },
      }),
    ).toBe(0);
    await expect(storage.read(session.temporaryKey)).resolves.toEqual(PNG);
    releaseStorage?.();
    const completed = await Promise.all(pending);
    expect(completed.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect((await sessions.findOwned(ownerId, session.id)).status).toBe(
      MediaUploadStatus.COMPLETED,
    );
    const job = await queue.getJob(session.id);
    expect(job).toBeDefined();
    expect(publication).toHaveBeenCalledTimes(1);
    expect(deleting).not.toHaveBeenCalled();
    await expect(storage.read(session.temporaryKey)).resolves.toEqual(PNG);
  });

  it('still compensates a claimed winner when queue publication fails', async () => {
    const session = await initiate();
    publication.mockRejectedValueOnce(
      new Error('Synthetic intake queue failure'),
    );
    expect((await upload(session.id)).status).toBe(500);
    expect((await sessions.findOwned(ownerId, session.id)).status).toBe(
      MediaUploadStatus.FAILED,
    );
    const records = await fixture.prisma.media.findMany({
      where: { metadata: { path: ['uploadSessionId'], equals: session.id } },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      status: 'FAILED',
      failureCode: 'INTAKE_FAILED',
    });
    expect(await queue.getJob(session.id)).toBeUndefined();
    await expect(
      app.get(StorageService).read(session.temporaryKey),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each([
    MediaUploadStatus.UPLOADING,
    MediaUploadStatus.COMPLETED,
    MediaUploadStatus.ABORTED,
    MediaUploadStatus.EXPIRED,
    MediaUploadStatus.FAILED,
  ])(
    'refuses a claim from %s without changing its persisted state',
    async (status) => {
      const session = await initiate();
      const before = await fixture.prisma.mediaUploadSession.update({
        where: { id: session.id },
        data: {
          status,
          completedAt:
            status === MediaUploadStatus.COMPLETED ? new Date() : null,
          metadata: { sentinel: 'preserve-state' },
        },
      });
      const repository = app.get<MediaUploadSessionRepository>(
        MEDIA_UPLOAD_SESSION_REPOSITORY,
      );
      await expect(repository.claimInitiated(session.id)).resolves.toBe(false);
      expect(
        await fixture.prisma.mediaUploadSession.findUnique({
          where: { id: session.id },
        }),
      ).toEqual(before);
      expect(publication).not.toHaveBeenCalled();
    },
  );
});
