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
});
