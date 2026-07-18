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
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

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

  beforeAll(async () => {
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
  });

  afterAll(async () => {
    await app.close();
  });
});
