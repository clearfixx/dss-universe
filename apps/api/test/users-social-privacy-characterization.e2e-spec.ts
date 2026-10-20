/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users Audit
 * 📄 File: apps/api/test/users-social-privacy-characterization.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Compares direct and social-list profile privacy through real GraphQL.
 *
 * 🧠 Responsibilities:
 * • owns synthetic users in a fully migrated isolated schema;
 * • authenticates viewers with actual Auth-issued credentials;
 * • characterizes existing projection divergence without correcting it.
 *
 * 🏗️ Architecture:
 * Audit-only HTTP characterization; a passing defect assertion is not acceptance.
 *
 * ⚠️ Important:
 * Only synthetic profile values are used. Production behavior is unchanged.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { UserSocialGraphService } from '../src/modules/users/application/services/user-social-graph.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Users social-list privacy characterization (e2e)', () => {
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
    await app.init();
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  async function register() {
    const id = randomUUID();
    return app.get(AuthenticationPresentationService).register({
      username: `privacy-${id}`,
      email: `${id}@dss.test`,
      password: 'synthetic-privacy-password-123',
    });
  }
  it('characterizes private fields hidden directly but returned through a public users followers', async () => {
    const owner = await register();
    const hub = await register();
    const viewer = await register();
    const bio = `synthetic-private-bio-${randomUUID()}`;
    const location = 'Synthetic Hidden Location';
    await fixture.prisma.user.update({
      where: { id: owner.user.id },
      data: { bio, location, interests: ['synthetic-private-interest'] },
    });
    await fixture.prisma.userPrivacySettings.create({
      data: {
        userId: owner.user.id,
        profileVisibility: 'PRIVATE',
        showLocation: false,
        showWebsite: false,
        showLastSeen: false,
      },
    });
    await app.get(UserSocialGraphService).follow(owner.user.id, hub.user.id);
    const direct = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${viewer.tokens.accessToken}`)
      .send({
        query:
          'query($username: String!) { userByUsername(username: $username) { id bio location interests } }',
        variables: { username: owner.user.username },
      })
      .expect(200);
    const directBody = direct.body as {
      errors?: unknown;
      data?: {
        userByUsername: {
          id: string;
          bio: string | null;
          location: string | null;
          interests: string[];
        };
      };
    };
    expect(directBody.errors).toBeUndefined();
    expect(directBody.data?.userByUsername).toEqual({
      id: owner.user.id,
      bio: null,
      location: null,
      interests: [],
    });
    const list = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${viewer.tokens.accessToken}`)
      .send({
        query:
          'query($id: ID!) { followers(userId: $id) { items { id bio location interests } total } }',
        variables: { id: hub.user.id },
      })
      .expect(200);
    const listBody = list.body as {
      errors?: unknown;
      data?: {
        followers: {
          items: {
            id: string;
            bio: string | null;
            location: string | null;
            interests: string[];
          }[];
          total: number;
        };
      };
    };
    expect(listBody.errors).toBeUndefined();
    // Pins the defect, not the intended privacy contract; correction needs approval.
    expect(listBody.data?.followers.items).toContainEqual({
      id: owner.user.id,
      bio,
      location,
      interests: ['synthetic-private-interest'],
    });
  });
});
