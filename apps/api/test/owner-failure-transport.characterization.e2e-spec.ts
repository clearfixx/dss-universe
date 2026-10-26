/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Root Owner Failure Characterization
 * 📄 File: apps/api/test/owner-failure-transport.characterization.e2e-spec.ts
 * 🎯 Purpose: Pins real Users/Media GraphQL failures before domain decoupling.
 * 🧠 Responsibilities: exercises profile lookup, asset assignment and media denial.
 * 🏗️ Architecture: Real AppModule and fully migrated private test schema.
 * ⚠️ Important: Synthetic DB assets only; no physical storage mutation or service mocks.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type Identity = { user: { id: string }; tokens: { accessToken: string } };
type FailureBody = {
  data: unknown;
  errors: { message: string; extensions: Record<string, unknown> }[];
};

describe('DEBT-079 real owner failure transport', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication<App>;
  let actor: Identity;
  let other: Identity;

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    );
    await app.init();
    const register = async (): Promise<Identity> => {
      const id = randomUUID();
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `${id}@dss.test`,
          username: `failure-${id}`,
          password: 'Synthetic-password-123!',
        })
        .expect(201);
      return response.body as Identity;
    };
    actor = await register();
    other = await register();
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });

  afterEach(async () => {
    expect(
      await fixture.prisma.user.findUniqueOrThrow({
        where: { id: actor.user.id },
        select: { avatarMediaId: true, coverMediaId: true },
      }),
    ).toEqual({ avatarMediaId: null, coverMediaId: null });
  });

  function assertFailure(
    body: FailureBody,
    message: string,
    statusCode: number,
    code: string,
  ) {
    expect(body.data).toBeNull();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].message).toBe(message);
    expect(body.errors[0].extensions).toEqual({ code, statusCode });
  }

  async function asset(
    ownerId: string,
    visibility: 'PUBLIC' | 'PRIVATE' = 'PUBLIC',
  ) {
    const id = randomUUID();
    return fixture.prisma.media.create({
      data: {
        ownerId,
        kind: 'IMAGE',
        status: 'READY',
        visibility,
        storageProvider: 'LOCAL',
        bucket: 'characterization',
        storageKey: id,
        originalFilename: 'synthetic.webp',
        mimeType: 'image/webp',
        extension: 'webp',
        size: 100,
        checksum: id,
        variants: {
          create: {
            name: 'original',
            storageProvider: 'LOCAL',
            bucket: 'characterization',
            storageKey: `${id}/original`,
            mimeType: 'image/webp',
            extension: 'webp',
            size: 100,
            checksum: id,
          },
        },
      },
    });
  }

  it('returns the Users not-found contract through public profile lookup', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: 'query($name:String!){userByUsername(username:$name){id}}',
        variables: { name: `absent-${randomUUID()}` },
      })
      .expect(200);
    assertFailure(
      response.body as FailureBody,
      'User not found',
      404,
      'NOT_FOUND',
    );
  });

  it.each([
    ['setViewerAvatar', 'avatar'],
    ['setViewerCover', 'profile cover'],
  ] as const)(
    'preserves ownership denial for %s through root composition',
    async (mutation, label) => {
      const media = await asset(other.user.id);
      const response = await request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', `Bearer ${actor.tokens.accessToken}`)
        .send({
          query: `mutation($id:ID!){${mutation}(mediaId:$id){id}}`,
          variables: { id: media.id },
        })
        .expect(200);
      assertFailure(
        response.body as FailureBody,
        `You can only use your own media as ${label === 'avatar' ? 'an avatar' : 'a profile cover'}.`,
        403,
        'FORBIDDEN',
      );
    },
  );

  it.each([
    ['setViewerAvatar', 'avatar'],
    ['setViewerCover', 'cover'],
  ] as const)(
    'preserves missing processed variant for %s',
    async (mutation, label) => {
      const media = await asset(actor.user.id);
      const response = await request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', `Bearer ${actor.tokens.accessToken}`)
        .send({
          query: `mutation($id:ID!){${mutation}(mediaId:$id){id}}`,
          variables: { id: media.id },
        })
        .expect(200);
      assertFailure(
        response.body as FailureBody,
        `The selected media is missing its processed ${label} variant.`,
        400,
        'BAD_USER_INPUT',
      );
    },
  );

  it.each([
    ['setViewerAvatar', 'an avatar'],
    ['setViewerCover', 'a profile cover'],
  ] as const)(
    'preserves ineligible visibility for %s',
    async (mutation, label) => {
      const media = await asset(actor.user.id, 'PRIVATE');
      const response = await request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', `Bearer ${actor.tokens.accessToken}`)
        .send({
          query: `mutation($id:ID!){${mutation}(mediaId:$id){id}}`,
          variables: { id: media.id },
        })
        .expect(200);
      assertFailure(
        response.body as FailureBody,
        `The selected media cannot be used as ${label}.`,
        400,
        'BAD_USER_INPUT',
      );
    },
  );

  it('preserves private media visibility denial after candidate lookup', async () => {
    const media = await asset(other.user.id, 'PRIVATE');
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${actor.tokens.accessToken}`)
      .send({
        query:
          'query($id:ID!){mediaAccessUrl(mediaId:$id,variantName:"original"){url}}',
        variables: { id: media.id },
      })
      .expect(200);
    assertFailure(
      response.body as FailureBody,
      'You do not have access to this media.',
      403,
      'FORBIDDEN',
    );
  });
});
