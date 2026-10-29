import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';

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
    expect(result.body).toMatchObject({
      data: {
        platformAppearance: {
          activeShellVariant: expect.stringMatching(
            /^(MODULE_LAUNCHER|HORIZONTAL_NAVIGATION|HYBRID)$/,
          ),
          updatedAt: expect.any(String),
        },
      },
    });
  });

  it('denies anonymous administrative reads and writes', async () => {
    const read = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: 'query { adminPlatformAppearance { activeShellVariant } }',
      })
      .expect(200);
    expect(read.body.errors).toEqual(expect.any(Array));
    expect(read.body.data?.adminPlatformAppearance).toBeFalsy();

    const mutation = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query:
          'mutation ($variant: ShellVariant!) { updatePlatformAppearance(activeShellVariant: $variant) { activeShellVariant } }',
        variables: { variant: 'HYBRID' },
      })
      .expect(200);
    expect(mutation.body.errors).toEqual(expect.any(Array));
    expect(mutation.body.data?.updatePlatformAppearance).toBeFalsy();
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
    expect(response.body.errors).toEqual(expect.any(Array));
    expect(response.body.data?.updatePlatformAppearance).toBeUndefined();
  });
});
