import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';

type AppearanceGraphQLResponse = {
  data?: {
    platformAppearance?: { activeShellVariant: string; updatedAt: string } | null;
    adminPlatformAppearance?: { activeShellVariant: string } | null;
    updatePlatformAppearance?: { activeShellVariant: string } | null;
  } | null;
  errors?: Array<{ message: string }>;
};

describe('Platform appearance GraphQL boundary (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const fixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication();
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

  afterAll(async () => {
    await app?.close();
  });

  it('exposes a safe enum-valued public configuration query', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: 'query { platformAppearance { activeShellVariant updatedAt } }',
      })
      .expect(200);
    const body = result.body as AppearanceGraphQLResponse;
    expect(body.data?.platformAppearance?.activeShellVariant).toMatch(
      /^(MODULE_LAUNCHER|HORIZONTAL_NAVIGATION|HYBRID)$/,
    );
    expect(typeof body.data?.platformAppearance?.updatedAt).toBe('string');
  });

  it('denies anonymous administrative reads and writes', async () => {
    const read = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: 'query { adminPlatformAppearance { activeShellVariant } }',
      })
      .expect(200);
    const deniedRead = read.body as AppearanceGraphQLResponse;
    expect(deniedRead.errors?.length).toBeGreaterThan(0);
    expect(deniedRead.data?.adminPlatformAppearance).toBeFalsy();

    const mutation = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query:
          'mutation ($variant: ShellVariant!) { updatePlatformAppearance(activeShellVariant: $variant) { activeShellVariant } }',
        variables: { variant: 'HYBRID' },
      })
      .expect(200);
    const deniedWrite = mutation.body as AppearanceGraphQLResponse;
    expect(deniedWrite.errors?.length).toBeGreaterThan(0);
    expect(deniedWrite.data?.updatePlatformAppearance).toBeFalsy();
  });

  it('rejects unrecognized variant identifiers at the GraphQL boundary', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query:
          'mutation ($variant: ShellVariant!) { updatePlatformAppearance(activeShellVariant: $variant) { activeShellVariant } }',
        variables: { variant: '#FFFFFF' },
      })
      .expect(200);
    const invalid = response.body as AppearanceGraphQLResponse;
    expect(invalid.errors?.length).toBeGreaterThan(0);
    expect(invalid.data?.updatePlatformAppearance).toBeUndefined();
  });
});
