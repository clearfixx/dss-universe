/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Presentation E2E
 * 📄 File: apps/api/test/auth-rest-validation.e2e-spec.ts
 * 🎯 Purpose: Protects REST validation and real authentication compatibility.
 * 🧠 Responsibilities: checks optional displayName, input denial and token flows.
 * 🏗️ Architecture: Real AppModule with a fully migrated owned test schema.
 * ⚠️ Important: No credential/session services are mocked; cleanup drops only the owned schema.
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
import { TwoFactorService } from '../src/modules/auth/application/services/two-factor.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('REST authentication validation (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication<App>;
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
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  const credentials = () => {
    const suffix = randomUUID();
    return {
      email: `rest-${suffix}@dss.test`,
      username: `rest-${suffix}`,
      password: 'Synthetic-password-123!',
    };
  };
  it('registers without displayName, logs in and refreshes through real Auth', async () => {
    const input = credentials();
    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...input, unexpected: 'discard' })
      .expect(201);
    const data = registered.body as {
      user: { id: string; displayName: string | null };
      tokens: { accessToken: string; refreshToken: string };
    };
    expect(data.user.id).toEqual(expect.any(String));
    expect(data.user.displayName).toBeNull();
    expect(JSON.stringify(data)).not.toContain('passwordHash');
    expect(JSON.stringify(data)).not.toContain('unexpected');
    const stored = await fixture.prisma.user.findUniqueOrThrow({
      where: { id: data.user.id },
    });
    expect(stored.passwordHash).not.toBe(input.password);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: input.email, password: input.password })
      .expect(201);
    const loggedIn = login.body as typeof data;
    expect(loggedIn.user.id).toBe(data.user.id);
    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: loggedIn.tokens.refreshToken })
      .expect(201);
    expect((refreshed.body as typeof data).user.id).toBe(data.user.id);
  });
  it('preserves a provided displayName', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...credentials(), displayName: 'Synthetic Pilot' })
      .expect(201);
    expect(
      (response.body as { user: { displayName: string } }).user.displayName,
    ).toBe('Synthetic Pilot');
  });
  it.each([null, '', '   ', 42])(
    'rejects invalid supplied displayName %p without enrollment',
    async (displayName) => {
      const before = await fixture.prisma.user.count();
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...credentials(), displayName })
        .expect(400);
      expect(await fixture.prisma.user.count()).toBe(before);
    },
  );
  it.each([
    [
      'register',
      {
        email: 'invalid',
        username: 'synthetic',
        password: 'Synthetic-password-123!',
      },
    ],
    [
      'register',
      { email: 'synthetic@dss.test', username: '', password: 'short' },
    ],
    ['login', { email: 'invalid', password: 'Synthetic-password-123!' }],
    ['login', { email: 'synthetic@dss.test', password: 42 }],
    [
      'login',
      {
        email: 'synthetic@dss.test',
        password: 'Synthetic-password-123!',
        twoFactorCode: 'invalid',
      },
    ],
    ['refresh', {}],
    ['refresh', { refreshToken: 42 }],
  ])('rejects malformed %s payload %#', async (method, input) => {
    await request(app.getHttpServer())
      .post(`/api/auth/${method}`)
      .send(input)
      .expect(400);
  });
  it('keeps empty refresh token as uniform authentication denial', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: '' })
      .expect(401);
  });

  it('characterizes missing second-factor proof through both transports', async () => {
    const input = credentials();
    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(input)
      .expect(201);
    const { user } = registered.body as { user: { id: string } };
    await app.get(TwoFactorService).begin(user.id, input.email);
    // Fixture enables the generated encrypted credential; setup confirmation is
    // covered elsewhere. This case only characterizes absent login proof.
    await fixture.prisma.userTwoFactor.update({
      where: { userId: user.id },
      data: { enabledAt: new Date('2026-01-01T00:00:00Z') },
    });
    const message = 'A valid two-factor or recovery code is required.';
    const rest = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: input.email, password: input.password })
      .expect(401);
    expect(rest.body).toEqual({
      statusCode: 401,
      message,
      error: 'Unauthorized',
    });
    const graphql = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Login($input: LoginInput!) {
          login(input: $input) { tokens { accessToken } }
        }`,
        variables: { input: { email: input.email, password: input.password } },
      })
      .expect(200);
    const body = graphql.body as {
      data: unknown;
      errors: { message: string; extensions: Record<string, unknown> }[];
    };
    expect(body.data).toBeNull();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].message).toBe(message);
    expect(body.errors[0].extensions).toEqual({
      code: 'UNAUTHENTICATED',
      statusCode: 401,
    });
    expect(
      (
        await fixture.prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { loginFailedAttempts: true },
        })
      ).loginFailedAttempts,
    ).toBe(0);
  });

  it('characterizes duplicate email through real registration composition', async () => {
    const input = credentials();
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(input)
      .expect(201);
    const before = await fixture.prisma.user.count();
    const duplicate = { ...input, username: credentials().username };
    const rest = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(duplicate)
      .expect(409);
    expect(rest.body).toEqual({
      statusCode: 409,
      message: 'User with this email already exists',
      error: 'Conflict',
    });
    const graphql = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Register($input: RegisterInput!) {
          register(input: $input) { user { id } }
        }`,
        variables: { input: { ...duplicate, displayName: 'Synthetic Pilot' } },
      })
      .expect(200);
    const body = graphql.body as {
      data: unknown;
      errors: { message: string; extensions: Record<string, unknown> }[];
    };
    expect(body.data).toBeNull();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].message).toBe('User with this email already exists');
    expect(body.errors[0].extensions).toEqual({
      code: 'CONFLICT',
      statusCode: 409,
    });
    expect(await fixture.prisma.user.count()).toBe(before);
  });

  it('characterizes a locked account through real REST and GraphQL', async () => {
    const input = credentials();
    const registered = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(input)
      .expect(201);
    const { user } = registered.body as { user: { id: string } };
    await fixture.prisma.user.update({
      where: { id: user.id },
      data: { loginLockedUntil: new Date('2099-01-01T00:00:00Z') },
    });
    const message = 'Login is temporarily unavailable. Please try again later.';
    const rest = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: input.email, password: input.password })
      .expect(429);
    expect(rest.body).toEqual({ statusCode: 429, message });
    expect(rest.headers['retry-after']).toBeUndefined();
    const graphql = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Login($input: LoginInput!) {
          login(input: $input) { tokens { accessToken } }
        }`,
        variables: { input: { email: input.email, password: input.password } },
      })
      .expect(200);
    const body = graphql.body as {
      data: unknown;
      errors: { message: string; extensions: Record<string, unknown> }[];
    };
    expect(body.data).toBeNull();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].message).toBe(message);
    expect(body.errors[0].extensions).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
    });
    const account = await fixture.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { loginFailedAttempts: true, loginLockedUntil: true },
    });
    expect(account).toEqual({
      loginFailedAttempts: 0,
      loginLockedUntil: new Date('2099-01-01T00:00:00Z'),
    });
  });

  it('characterizes invalid credentials through the real REST boundary', async () => {
    const input = credentials();
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: input.email, password: input.password })
      .expect(401);
    expect(response.body).toEqual({
      statusCode: 401,
      message: 'Invalid email or password',
      error: 'Unauthorized',
    });
    expect(response.headers['retry-after']).toBeUndefined();
  });

  it('characterizes invalid credentials through the real GraphQL boundary', async () => {
    const input = credentials();
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Login($input: LoginInput!) {
          login(input: $input) { tokens { accessToken } }
        }`,
        variables: { input: { email: input.email, password: input.password } },
      })
      .expect(200);
    const body = response.body as {
      data: unknown;
      errors: { message: string; extensions: Record<string, unknown> }[];
    };
    expect(body.data).toBeNull();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].message).toBe('Invalid email or password');
    expect(body.errors[0].extensions).toEqual({
      code: 'UNAUTHENTICATED',
      statusCode: 401,
    });
  });
});
