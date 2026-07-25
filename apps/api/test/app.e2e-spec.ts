/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: API Test Infrastructure
 * 📄 File: apps/api/test/app.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies REST compatibility and the GraphQL Auth/Users vertical slice.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { GraphQLSchemaHost } from '@nestjs/graphql';
import { Test, type TestingModule } from '@nestjs/testing';
import { printSchema } from 'graphql';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';
import request from 'supertest';
import type { Job } from 'bullmq';
import type { MediaProcessingJob } from '@dss/jobs';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/database';
import { QueueRegistryService } from './../src/core/queue';
import { StorageService } from './../src/core/storage';
import { MediaRetentionService } from './../src/modules/media/application/services/media-retention.service';
import { LocalMediaFileProcessor } from '../../worker/src/local-media-file.processor';
import { createMediaProcessingProcessor } from '../../worker/src/media-processing.processor';
import { PostgresMediaProcessingStore } from '../../worker/src/postgres-media-processing.store';

const E2E_UPLOADS_DIR = `.e2e-uploads-${process.pid}`;
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

type GraphqlErrorResponse = {
  errors: Array<{ extensions: { code: string } }>;
};

type RegisterResponse = {
  data: {
    register: {
      user: { id: string; email: string; username: string };
      tokens: { accessToken: string };
    };
  };
};

type RegisterErrorResponse = {
  errors?: Array<{ extensions: { code: string } }>;
};

type InitiateMediaUploadResponse = {
  data: {
    initiateMediaUpload: {
      id: string;
      policyKey: string;
      status: string;
      declaredMimeType: string;
      expiresAt: string;
    };
  };
  errors?: Array<{ message: string }>;
};

describe('DSS API (e2e)', () => {
  let app: INestApplication<App>;
  let processingPool: Pool;

  beforeAll(async () => {
    process.env.DSS_UPLOADS_DIR = E2E_UPLOADS_DIR;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    );
    await app.init();
    processingPool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  it('preserves the REST application status endpoint', async () => {
    await request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect({ app: 'DSS Universe API', status: 'ok' });
  });

  it('exposes separate liveness and dependency readiness with request IDs', async () => {
    const live = await request(app.getHttpServer())
      .get('/api/health/live')
      .set('x-request-id', 'dss-health-proof')
      .expect(200);
    expect(live.headers['x-request-id']).toBe('dss-health-proof');
    expect(live.body).toMatchObject({ status: 'ok', service: 'dss-api' });

    const ready = await request(app.getHttpServer())
      .get('/api/health/ready')
      .expect(200);
    expect(ready.body).toMatchObject({
      status: 'ok',
      database: { status: 'up' },
      redis: { status: 'up' },
      queues: { status: 'up' },
    });
  });

  it('exposes the GraphQL transport status query', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query: '{ apiInfo { name status transport } }' })
      .expect(200);

    expect(response.body).toEqual({
      data: {
        apiInfo: {
          name: 'DSS Universe API',
          status: 'ok',
          transport: 'graphql',
        },
      },
    });
  });

  it('generates a deterministic schema without authentication secrets', () => {
    const schema = printSchema(app.get(GraphQLSchemaHost).schema);

    expect(schema).toContain('type Viewer');
    expect(schema).toContain('register(input: RegisterInput!)');
    expect(schema).toContain('users(pagination: UsersPageInput)');
    expect(schema).toContain('setViewerAvatar(mediaId: ID!)');
    expect(schema).toContain('removeViewerAvatar: Viewer!');
    expect(schema).toContain(
      'mediaAccessUrl(mediaId: ID!, variantName: String!): MediaAccess!',
    );
    expect(schema).not.toContain('passwordHash');
    expect(schema).not.toContain('refreshTokenHash');
  });

  it('returns a stable unauthenticated GraphQL error code', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query: '{ viewer { id } }' })
      .expect(200);
    const body = response.body as GraphqlErrorResponse;

    expect(body.errors[0]?.extensions.code).toBe('UNAUTHENTICATED');
  });

  it('rejects GraphQL operations above the complexity limit', async () => {
    const fields = Array.from(
      { length: 251 },
      (_, index) => `status${index}: apiInfo { status }`,
    ).join('\n');
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query: `{ ${fields} }` })
      .expect(400);

    const body = response.body as GraphqlErrorResponse;

    expect(body.errors).toBeDefined();
  });

  it('registers and resolves the authenticated viewer through GraphQL', async () => {
    const suffix = String(Date.now()) + Math.random().toString(16).slice(2);
    const username = 'astronaut-' + suffix;
    const email = username + '@dss.test';
    const registration = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation {
          register(input: {
            email: "${email}"
            username: "${username}"
            displayName: "Phase Three Astronaut"
            password: "dss-test-password"
          }) {
            user { id email username }
            tokens { accessToken }
          }
        }`,
      });
    const registered = registration.body as RegisterResponse;
    const registrationError = registration.body as RegisterErrorResponse;

    expect(registrationError.errors).toBeUndefined();
    expect(registration.status).toBe(200);
    const accessToken = registered.data.register.tokens.accessToken;

    expect(registered.data.register.user.email).toBe(email);

    const viewer = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({ query: '{ viewer { id email username } }' })
      .expect(200);

    expect(viewer.body).toEqual({
      data: {
        viewer: registered.data.register.user,
      },
    });

    const userLookup = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .set('Content-Type', 'application/json')
      .send(
        JSON.stringify({
          query:
            'query UserByUsername($username: String!) { userByUsername(username: $username) { id username } }',
          variables: { username },
        }),
      );

    expect(userLookup.body).not.toHaveProperty('errors');
    expect(userLookup.status).toBe(200);

    expect(userLookup.body).toEqual({
      data: {
        userByUsername: {
          id: registered.data.register.user.id,
          username,
        },
      },
    });

    const initiatedUpload = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation InitiateMediaUpload($input: InitiateMediaUploadInput!) {
          initiateMediaUpload(input: $input) {
            id policyKey status declaredMimeType expiresAt
          }
        }`,
        variables: {
          input: {
            policyKey: 'avatar',
            originalFilename: 'commander.png',
            declaredMimeType: 'image/png',
            declaredSize: 2048,
          },
        },
      })
      .expect(200);
    const uploadBody = initiatedUpload.body as InitiateMediaUploadResponse;

    expect(uploadBody.errors).toBeUndefined();
    expect(uploadBody.data.initiateMediaUpload).toMatchObject({
      policyKey: 'avatar',
      status: 'INITIATED',
      declaredMimeType: 'image/png',
    });
    const abortedUpload = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation AbortMediaUpload($id: String!) {
          abortMediaUpload(id: $id) { id status }
        }`,
        variables: { id: uploadBody.data.initiateMediaUpload.id },
      })
      .expect(200);

    expect(abortedUpload.body).toEqual({
      data: {
        abortMediaUpload: {
          id: uploadBody.data.initiateMediaUpload.id,
          status: 'ABORTED',
        },
      },
    });

    const binarySession = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation InitiateMediaUpload($input: InitiateMediaUploadInput!) {
          initiateMediaUpload(input: $input) { id status }
        }`,
        variables: {
          input: {
            policyKey: 'avatar',
            originalFilename: 'commander.png',
            declaredMimeType: 'image/png',
            declaredSize: PNG_1X1.length,
          },
        },
      })
      .expect(200);
    const binarySessionBody = binarySession.body as {
      data: { initiateMediaUpload: { id: string; status: string } };
      errors?: Array<{ message: string }>;
    };
    expect(binarySessionBody.errors).toBeUndefined();

    const binaryUpload = await request(app.getHttpServer())
      .put(
        `/api/media/uploads/${binarySessionBody.data.initiateMediaUpload.id}/content`,
      )
      .set('Authorization', 'Bearer ' + accessToken)
      .attach('file', PNG_1X1, {
        filename: 'commander.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(binaryUpload.body).toMatchObject({
      id: binarySessionBody.data.initiateMediaUpload.id,
      policyKey: 'avatar',
      status: 'COMPLETED',
      declaredMimeType: 'image/png',
    });
    expect(binaryUpload.body).not.toHaveProperty('temporaryKey');
    expect(binaryUpload.body).not.toHaveProperty('bucket');

    const uploadSessionId = binarySessionBody.data.initiateMediaUpload.id;
    const queuedJob = await app
      .get(QueueRegistryService)
      .mediaProcessing.getJob(uploadSessionId);
    expect(queuedJob).not.toBeNull();
    const processingJob = queuedJob as Job<MediaProcessingJob>;
    expect(processingJob.data).toMatchObject({
      uploadSessionId,
      processingKind: 'IMAGE',
      variants: [
        { name: 'avatar-64' },
        { name: 'avatar-128' },
        { name: 'avatar-256' },
      ],
    });

    const processMedia = createMediaProcessingProcessor(
      new PostgresMediaProcessingStore(processingPool),
      new LocalMediaFileProcessor(join(process.cwd(), E2E_UPLOADS_DIR)),
      { scan: () => Promise.resolve({ status: 'CLEAN' as const }) },
    );
    await expect(processMedia(processingJob)).resolves.toEqual({
      mediaId: processingJob.data.mediaId,
      duplicate: false,
      quarantined: false,
    });

    const processedMedia = await app.get(PrismaService).media.findUnique({
      where: { id: processingJob.data.mediaId },
      include: { variants: { orderBy: { name: 'asc' } } },
    });
    expect(processedMedia).toMatchObject({
      status: 'READY',
      mimeType: 'image/webp',
      extension: 'webp',
      width: 1,
      height: 1,
    });
    expect(processedMedia?.variants.map((variant) => variant.name)).toEqual([
      'avatar-128',
      'avatar-256',
      'avatar-64',
    ]);

    const mediaId = processingJob.data.mediaId;
    const setAvatar = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `mutation SetViewerAvatar($mediaId: ID!) {
          setViewerAvatar(mediaId: $mediaId) { id avatarUrl }
        }`,
        variables: { mediaId },
      })
      .expect(200);

    expect(setAvatar.body).toEqual({
      data: {
        setViewerAvatar: {
          id: registered.data.register.user.id,
          avatarUrl: `/api/media/public/${mediaId}/avatar-256`,
        },
      },
    });

    await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query:
          'mutation SetViewerAvatar($mediaId: ID!) { setViewerAvatar(mediaId: $mediaId) { id } }',
        variables: { mediaId },
      })
      .expect(200);

    const deliveredAvatar = await request(app.getHttpServer())
      .get(`/api/media/public/${mediaId}/avatar-256`)
      .expect(200)
      .expect('Content-Type', /image\/webp/);
    expect(deliveredAvatar.headers['cache-control']).toContain('immutable');
    expect(deliveredAvatar.body).toBeInstanceOf(Buffer);

    const avatarState = await app.get(PrismaService).user.findUniqueOrThrow({
      where: { id: registered.data.register.user.id },
      include: {
        avatarMedia: true,
      },
    });
    expect(avatarState.avatarMediaId).toBe(mediaId);
    expect(avatarState.avatarMedia?.id).toBe(mediaId);
    await expect(
      app.get(PrismaService).mediaReference.count({
        where: {
          mediaId,
          targetId: avatarState.id,
          purpose: 'avatar',
          removedAt: null,
        },
      }),
    ).resolves.toBe(1);
    await expect(
      app.get(PrismaService).mediaReference.count({
        where: {
          mediaId,
          targetId: avatarState.id,
          purpose: 'avatar',
        },
      }),
    ).resolves.toBe(2);

    const removeAvatar = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: 'mutation { removeViewerAvatar { id avatarUrl } }',
      })
      .expect(200);
    expect(removeAvatar.body).toEqual({
      data: {
        removeViewerAvatar: {
          id: registered.data.register.user.id,
          avatarUrl: `/api/media/avatars/fallback/${username}.svg`,
        },
      },
    });

    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: registered.data.register.user.id,
          action: { in: ['user.avatar.assigned', 'user.avatar.removed'] },
        },
      }),
    ).resolves.toBe(3);
    await expect(
      app.get(PrismaService).mediaReference.count({
        where: {
          mediaId,
          targetId: registered.data.register.user.id,
          purpose: 'avatar',
          removedAt: null,
        },
      }),
    ).resolves.toBe(0);

    await request(app.getHttpServer())
      .get(`/api/media/avatars/fallback/${username}.svg`)
      .expect(200)
      .expect('Content-Type', /image\/svg\+xml/);

    await app.get(PrismaService).media.update({
      where: { id: mediaId },
      data: { visibility: 'PRIVATE' },
    });
    await request(app.getHttpServer())
      .get(`/api/media/public/${mediaId}/avatar-256`)
      .expect(404);

    const access = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        query: `query MediaAccess($mediaId: ID!, $variantName: String!) {
          mediaAccessUrl(mediaId: $mediaId, variantName: $variantName) {
            url expiresAt
          }
        }`,
        variables: { mediaId, variantName: 'avatar-256' },
      })
      .expect(200);
    const accessBody = access.body as {
      data: { mediaAccessUrl: { url: string; expiresAt: string } };
      errors?: Array<{ message: string }>;
    };
    expect(accessBody.errors).toBeUndefined();
    expect(accessBody.data.mediaAccessUrl.url).toMatch(
      /^\/api\/media\/signed\//,
    );
    expect(accessBody.data.mediaAccessUrl.url).not.toContain('processed/');

    await request(app.getHttpServer())
      .get(accessBody.data.mediaAccessUrl.url)
      .expect(200)
      .expect('Cache-Control', 'private, no-store')
      .expect('Content-Type', /image\/webp/);
    await request(app.getHttpServer())
      .get(`${accessBody.data.mediaAccessUrl.url}x`)
      .expect(401);

    await app.get(PrismaService).media.update({
      where: { id: mediaId },
      data: {
        status: 'QUARANTINED',
        failureCode: 'MALWARE_DETECTED',
        failureReason: 'Eicar-Signature',
      },
    });
    const deniedQuarantine = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({ query: '{ quarantinedMedia { id status failureCode } }' })
      .expect(200);
    expect(deniedQuarantine.body).toMatchObject({
      data: null,
      errors: [{ extensions: { code: 'FORBIDDEN' } }],
    });

    const quarantinePermission = await app
      .get(PrismaService)
      .permission.upsert({
        where: { key: 'media.quarantine.manage' },
        update: {},
        create: {
          key: 'media.quarantine.manage',
          label: 'Manage media quarantine',
        },
      });
    const libraryPermission = await app.get(PrismaService).permission.upsert({
      where: { key: 'media.library.read' },
      update: {},
      create: {
        key: 'media.library.read',
        label: 'Read Media Library',
      },
    });
    const jobsPermission = await app.get(PrismaService).permission.upsert({
      where: { key: 'media.jobs.manage' },
      update: {},
      create: {
        key: 'media.jobs.manage',
        label: 'Manage media jobs',
      },
    });
    await app.get(PrismaService).userPermission.createMany({
      data: [quarantinePermission, libraryPermission, jobsPermission].map(
        (permission) => ({
          userId: registered.data.register.user.id,
          permissionId: permission.id,
        }),
      ),
    });
    const login = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Login($input: LoginInput!) {
          login(input: $input) { tokens { accessToken } }
        }`,
        variables: {
          input: { email, password: 'dss-test-password' },
        },
      })
      .expect(200);
    const managerToken = (
      login.body as { data: { login: { tokens: { accessToken: string } } } }
    ).data.login.tokens.accessToken;

    const quarantineList = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + managerToken)
      .send({
        query:
          '{ quarantinedMedia(limit: 10) { id status failureCode failureReason } }',
      })
      .expect(200);
    expect(quarantineList.body).toEqual({
      data: {
        quarantinedMedia: [
          {
            id: mediaId,
            status: 'QUARANTINED',
            failureCode: 'MALWARE_DETECTED',
            failureReason: 'Eicar-Signature',
          },
        ],
      },
    });

    const mediaLibrary = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + managerToken)
      .send({
        query: `query MediaLibrary($input: MediaLibraryInput) {
          mediaLibrary(input: $input) {
            items { id kind status visibility originalFilename }
            pageInfo { hasNextPage endCursor }
          }
          mediaLibraryMetrics {
            totalMedia originalBytes variantBytes totalBytes
            orphanedMedia failedMedia quarantinedMedia
          }
        }`,
        variables: {
          input: {
            first: 10,
            search: 'commander',
            status: 'QUARANTINED',
            orphaned: true,
          },
        },
      })
      .expect(200);
    const libraryBody = mediaLibrary.body as {
      data: {
        mediaLibrary: {
          items: Array<{
            id: string;
            kind: string;
            status: string;
            visibility: string;
            originalFilename: string;
          }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
        mediaLibraryMetrics: {
          totalMedia: number;
          originalBytes: number;
          variantBytes: number;
          totalBytes: number;
          orphanedMedia: number;
          failedMedia: number;
          quarantinedMedia: number;
        };
      };
      errors?: Array<{ message: string }>;
    };
    expect(libraryBody.errors).toBeUndefined();
    expect(libraryBody.data.mediaLibrary.items).toEqual([
      {
        id: mediaId,
        kind: 'IMAGE',
        status: 'QUARANTINED',
        visibility: 'PRIVATE',
        originalFilename: 'commander.png',
      },
    ]);
    expect(libraryBody.data.mediaLibrary.pageInfo.hasNextPage).toBe(false);
    expect(typeof libraryBody.data.mediaLibrary.pageInfo.endCursor).toBe(
      'string',
    );
    expect(libraryBody.data.mediaLibraryMetrics).toMatchObject({
      quarantinedMedia: 1,
    });
    expect(libraryBody.data.mediaLibraryMetrics.totalBytes).toBeGreaterThan(0);

    const rescan = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + managerToken)
      .send({
        query: `mutation Rescan($mediaId: ID!) {
          rescanQuarantinedMedia(mediaId: $mediaId) { id status }
        }`,
        variables: { mediaId },
      })
      .expect(200);
    expect(rescan.body).toEqual({
      data: {
        rescanQuarantinedMedia: { id: mediaId, status: 'QUARANTINED' },
      },
    });

    const rejected = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + managerToken)
      .send({
        query: `mutation Reject($mediaId: ID!) {
          rejectQuarantinedMedia(mediaId: $mediaId) { id status }
        }`,
        variables: { mediaId },
      })
      .expect(200);
    expect(rejected.body).toEqual({
      data: {
        rejectQuarantinedMedia: { id: mediaId, status: 'REJECTED' },
      },
    });
    await app.get(PrismaService).media.update({
      where: { id: mediaId },
      data: {
        status: 'FAILED',
        failureCode: 'PROCESSING_FAILED',
        failureReason: 'Synthetic retry proof',
      },
    });
    const retry = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + managerToken)
      .send({
        query: `mutation RetryFailedMedia($mediaId: ID!) {
          retryFailedMedia(mediaId: $mediaId) {
            id status failureCode
          }
        }`,
        variables: { mediaId },
      })
      .expect(200);
    expect(retry.body).toEqual({
      data: {
        retryFailedMedia: {
          id: mediaId,
          status: 'PROCESSING',
          failureCode: null,
        },
      },
    });
    await expect(
      app.get(PrismaService).auditRecord.count({
        where: {
          actorId: registered.data.register.user.id,
          action: 'media.processing.retry_requested',
          targetId: mediaId,
        },
      }),
    ).resolves.toBe(1);
    const rescanJobs = await app
      .get(QueueRegistryService)
      .mediaProcessing.getJobs(['waiting', 'delayed']);
    await Promise.all(
      rescanJobs
        .filter((job) => job.data.mediaId === mediaId)
        .map((job) => job.remove()),
    );
    await queuedJob?.remove();
  });

  it('purges only claimed unreferenced media after retention', async () => {
    const storage = app.get(StorageService);
    const retention = app.get(MediaRetentionService);
    const prisma = app.get(PrismaService);
    const original = await storage.save({
      buffer: Buffer.from('old-original'),
      directory: 'cleanup',
      filename: `original-${Date.now()}.webp`,
    });
    const variant = await storage.save({
      buffer: Buffer.from('old-variant'),
      directory: 'cleanup',
      filename: `variant-${Date.now()}.webp`,
    });
    const oldDate = new Date('2026-05-01T00:00:00.000Z');
    const media = await prisma.media.create({
      data: {
        kind: 'IMAGE',
        status: 'READY',
        visibility: 'PRIVATE',
        storageProvider: 'LOCAL',
        bucket: 'media',
        storageKey: original.path,
        originalFilename: 'old.webp',
        mimeType: 'image/webp',
        extension: 'webp',
        size: 12,
        checksum: 'old-original-checksum',
        readyAt: oldDate,
        createdAt: oldDate,
        variants: {
          create: {
            name: 'content-640',
            storageProvider: 'LOCAL',
            bucket: 'media',
            storageKey: variant.path,
            mimeType: 'image/webp',
            extension: 'webp',
            size: 11,
            checksum: 'old-variant-checksum',
          },
        },
      },
    });

    await expect(
      retention.runOnce(new Date('2026-07-25T00:00:00.000Z')),
    ).resolves.toBeGreaterThanOrEqual(1);
    const cleaned = await prisma.media.findUniqueOrThrow({
      where: { id: media.id },
    });
    expect(cleaned.status).toBe('DELETED');
    expect(cleaned.deletedAt).toBeInstanceOf(Date);
    await expect(storage.read(original.path)).rejects.toThrow();
    await expect(storage.read(variant.path)).rejects.toThrow();
    await expect(
      prisma.auditRecord.count({
        where: {
          targetId: media.id,
          action: {
            in: ['media.cleanup.claimed', 'media.cleanup.completed'],
          },
        },
      }),
    ).resolves.toBe(2);
  });

  afterAll(async () => {
    await app.close();
    await processingPool.end();
    await rm(join(process.cwd(), E2E_UPLOADS_DIR), {
      recursive: true,
      force: true,
    });
    delete process.env.DSS_UPLOADS_DIR;
  });
});
