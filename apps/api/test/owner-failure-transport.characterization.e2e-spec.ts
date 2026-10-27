/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Root Owner Failure Characterization
 * 📄 File: apps/api/test/owner-failure-transport.characterization.e2e-spec.ts
 * 🎯 Purpose: Preserves owner transport failures through domain decoupling.
 * 🧠 Responsibilities: exercises real denials and controlled production-redaction faults.
 * 🏗️ Architecture: Real AppModule and fully migrated private test schema.
 * ⚠️ Important: Real denial paths use no service mocks; explicit fault-injection
 * cases only test unknown-error propagation and production formatter redaction.
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
import {
  VIEWER_PROFILE_READER,
  type ViewerProfileReader,
} from '../src/modules/users';
import { UsersService } from '../src/modules/users/application/services/users.service';
import { UserNotFoundException } from '../src/modules/users/domain/exceptions/user-not-found.exception';
import { TwoFactorService } from '../src/modules/auth/application/services/two-factor.service';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type Identity = {
  user: { id: string };
  tokens: { accessToken: string; refreshToken: string };
};
type FailureBody = {
  data: unknown;
  errors: { message: string; extensions: Record<string, unknown> }[];
};

describe('DEBT-079 real owner failure transport', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication<App>;
  let actor: Identity;
  let other: Identity;
  const nodeEnv = process.env.NODE_ENV;

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
    jest.restoreAllMocks();
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
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

  it.each([
    [
      'deactivateAccount',
      'DeactivateAccountInput',
      { password: 'Incorrect-password-123!' },
    ],
    [
      'changeViewerEmail',
      'ChangeEmailInput',
      {
        email: 'unused@dss.invalid',
        currentPassword: 'Incorrect-password-123!',
      },
    ],
    [
      'changeViewerPassword',
      'ChangePasswordInput',
      {
        newPassword: 'New-synthetic-password-123!',
        currentPassword: 'Incorrect-password-123!',
      },
    ],
  ] as const)(
    'preserves local Auth credential denial for %s',
    async (mutation, inputType, input) => {
      const before = await fixture.prisma.user.findUniqueOrThrow({
        where: { id: actor.user.id },
        select: {
          email: true,
          passwordHash: true,
          status: true,
          authVersion: true,
        },
      });
      const response = await request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', `Bearer ${actor.tokens.accessToken}`)
        .send({
          query: `mutation($input:${inputType}!){${mutation}(input:$input){success}}`,
          variables: { input },
        })
        .expect(200);
      assertFailure(
        response.body as FailureBody,
        'Invalid email or password',
        401,
        'UNAUTHENTICATED',
      );
      expect(
        await fixture.prisma.user.findUniqueOrThrow({
          where: { id: actor.user.id },
          select: {
            email: true,
            passwordHash: true,
            status: true,
            authVersion: true,
          },
        }),
      ).toEqual(before);
    },
  );

  it('preserves local Auth duplicate-email denial after password verification', async () => {
    const otherRow = await fixture.prisma.user.findUniqueOrThrow({
      where: { id: other.user.id },
    });
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${actor.tokens.accessToken}`)
      .send({
        query:
          'mutation($input:ChangeEmailInput!){changeViewerEmail(input:$input){success}}',
        variables: {
          input: {
            email: otherRow.email,
            currentPassword: 'Synthetic-password-123!',
          },
        },
      })
      .expect(200);
    assertFailure(
      response.body as FailureBody,
      'User with this email already exists',
      409,
      'CONFLICT',
    );
    expect(
      (
        await fixture.prisma.user.findUniqueOrThrow({
          where: { id: actor.user.id },
        })
      ).email,
    ).not.toBe(otherRow.email);
  });

  it('maps local two-factor proof denial without disabling or consuming credentials', async () => {
    const user = await fixture.prisma.user.findUniqueOrThrow({
      where: { id: actor.user.id },
    });
    await app.get(TwoFactorService).begin(user.id, user.email);
    await fixture.prisma.userTwoFactor.update({
      where: { userId: user.id },
      data: { enabledAt: new Date('2026-01-01') },
    });
    const before = await fixture.prisma.userTwoFactor.findUniqueOrThrow({
      where: { userId: user.id },
    });
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${actor.tokens.accessToken}`)
      .send({
        query:
          'mutation($input:DisableTwoFactorInput!){disableViewerTwoFactor(input:$input){success}}',
        variables: {
          input: { password: 'Synthetic-password-123!', code: 'abcdef-abcdef' },
        },
      })
      .expect(200);
    assertFailure(
      response.body as FailureBody,
      'A valid two-factor or recovery code is required.',
      401,
      'UNAUTHENTICATED',
    );
    expect(
      await fixture.prisma.userTwoFactor.findUniqueOrThrow({
        where: { userId: user.id },
      }),
    ).toEqual(before);
  });

  it('redacts unknown Users failure details through the production formatter', async () => {
    const sentinel = 'synthetic-private-database-location';
    jest
      .spyOn(app.get(UsersService), 'getPublicByUsername')
      .mockRejectedValueOnce(
        new Error(sentinel, { cause: new Error('synthetic-private-cause') }),
      );
    process.env.NODE_ENV = 'production';
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query: 'query{userByUsername(username:"synthetic"){id}}' })
      .expect(200);
    const body = response.body as FailureBody;
    expect(body.data).toBeNull();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].message).toBe('An unexpected error occurred.');
    expect(body.errors[0].extensions).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
    });
    expect(JSON.stringify(body)).not.toMatch(
      /synthetic-private|stacktrace|originalError/,
    );
  });

  it('keeps a known Users failure public under production redaction', async () => {
    jest
      .spyOn(app.get(UsersService), 'getPublicByUsername')
      .mockRejectedValueOnce(new UserNotFoundException());
    process.env.NODE_ENV = 'production';
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query: 'query{userByUsername(username:"synthetic"){id}}' })
      .expect(200);
    assertFailure(
      response.body as FailureBody,
      'User not found',
      404,
      'NOT_FOUND',
    );
  });

  it.each(['REST', 'GraphQL'] as const)(
    'does not turn an unknown identity failure into credentials denial over %s',
    async (transport) => {
      jest
        .spyOn(app.get(AuthenticationPresentationService), 'login')
        .mockRejectedValueOnce(
          new Error('synthetic-private-identity-location'),
        );
      process.env.NODE_ENV = 'production';
      const input = {
        email: 'synthetic@dss.invalid',
        password: 'Synthetic-password-123!',
      };
      if (transport === 'REST') {
        const response = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send(input)
          .expect(500);
        expect(response.body).toEqual({
          statusCode: 500,
          message: 'Internal server error',
        });
      } else {
        const response = await request(app.getHttpServer())
          .post('/api/graphql')
          .send({
            query:
              'mutation($input:LoginInput!){login(input:$input){tokens{accessToken}}}',
            variables: { input },
          })
          .expect(200);
        const body = response.body as FailureBody;
        expect(body.data).toBeNull();
        expect(body.errors).toHaveLength(1);
        expect(body.errors[0].message).toBe('An unexpected error occurred.');
        expect(body.errors[0].extensions).toEqual({
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
    },
  );

  it('keeps refresh uniformly denied after a profile infrastructure failure', async () => {
    const profiles = app.get<ViewerProfileReader>(VIEWER_PROFILE_READER);
    const read = jest
      .spyOn(profiles, 'findById')
      .mockRejectedValueOnce(new Error('synthetic-private-profile-location'));
    process.env.NODE_ENV = 'production';
    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: actor.tokens.refreshToken })
      .expect(401);
    expect(read).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual({
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
    });
  });
});
