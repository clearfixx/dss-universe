/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles E2E
 * 📄 File: apps/api/test/custom-titles-foundation.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies permission-backed title lifecycle, cooldown, selection, and history.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/database';

type RegisteredUser = {
  id: string;
  email: string;
  accessToken: string;
};

type TitleResult = {
  id: string;
  name: string;
  color: string;
  badge: string;
  isActive: boolean;
};

type GrantResult = {
  id: string;
  userId: string;
  selected: boolean;
  revokedAt: string | null;
  title: TitleResult;
};

describe('Custom Titles foundation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.outboxEvent.deleteMany({
        where: { producer: 'dss.api.custom-titles' },
      });
    }
    if (app) await app.close();
  });

  it('preserves grants while enforcing permission and selection policy', async () => {
    const user = await register('title-user');
    const admin = await register('title-admin');
    const permissions = await prisma.permission.findMany({
      where: {
        key: {
          in: ['custom-titles.manage', 'custom-titles.settings.manage'],
        },
      },
    });
    expect(permissions).toHaveLength(2);
    await prisma.userPermission.createMany({
      data: permissions.map((permission) => ({
        userId: admin.id,
        permissionId: permission.id,
      })),
    });
    const adminToken = await login(admin.email);
    const runSuffix = user.id.slice(0, 8);

    const first = await createTitle(adminToken, {
      name: `User of the Year ${runSuffix}`,
      description: 'Annual community award.',
      color: '#7C3AED',
      badge: 'crown',
    });
    const second = await createTitle(adminToken, {
      name: `Best Author ${runSuffix}`,
      description: 'Recognizes outstanding publications.',
      color: '#0EA5E9',
      badge: 'pen-tool',
    });
    expect(first).toMatchObject({
      name: `User of the Year ${runSuffix}`,
      color: '#7C3AED',
      isActive: true,
    });

    const firstGrant = await grantTitle(
      adminToken,
      user.id,
      first.id,
      'Won the annual community vote.',
    );
    const secondGrant = await grantTitle(
      adminToken,
      user.id,
      second.id,
      'Published consistently excellent research.',
    );
    expect(await userTitles(user.accessToken, user.id)).toHaveLength(2);
    await updateCooldown(adminToken, 30);

    const selectedFirst = await selectTitle(user.accessToken, firstGrant.id);
    expect(selectedFirst).toMatchObject({ id: firstGrant.id, selected: true });
    await expect(
      selectTitle(user.accessToken, firstGrant.id),
    ).resolves.toMatchObject({ id: firstGrant.id, selected: true });

    const blocked = await graphql(user.accessToken, {
      query: `mutation Select($grantId: ID!) {
        selectCustomTitle(grantId: $grantId) { id selected }
      }`,
      variables: { grantId: secondGrant.id },
    });
    const blockedBody = blocked.body as {
      errors?: Array<{ message: string }>;
    };
    expect(blockedBody.errors?.[0]?.message).toContain(
      'Display title may be changed after',
    );

    await updateCooldown(adminToken, 0);
    const selectedSecond = await selectTitle(user.accessToken, secondGrant.id);
    expect(selectedSecond).toMatchObject({
      id: secondGrant.id,
      selected: true,
    });

    const revoked = await revokeTitle(
      adminToken,
      secondGrant.id,
      'Award period ended.',
    );
    expect(revoked.revokedAt).not.toBeNull();
    const active = await userTitles(user.accessToken, user.id);
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ id: firstGrant.id, selected: false });

    const archived = await updateTitle(adminToken, {
      id: first.id,
      name: first.name,
      description: 'Annual community award.',
      color: first.color,
      badge: first.badge,
      isActive: false,
    });
    expect(archived.isActive).toBe(false);
    const activeDefinitions = await activeTitles(user.accessToken);
    expect(activeDefinitions.map((title) => title.id)).toContain(second.id);
    expect(activeDefinitions.map((title) => title.id)).not.toContain(first.id);
    const allDefinitions = await allTitles(adminToken);
    expect(allDefinitions.map((title) => title.id)).toEqual(
      expect.arrayContaining([first.id, second.id]),
    );

    await expect(
      prisma.userTitleGrant.delete({ where: { id: firstGrant.id } }),
    ).rejects.toThrow(
      'custom title grants are historical and cannot be deleted',
    );

    const [auditCount, outboxCount] = await Promise.all([
      prisma.auditRecord.count({
        where: { action: { startsWith: 'custom-titles.' } },
      }),
      prisma.outboxEvent.count({
        where: { producer: 'dss.api.custom-titles' },
      }),
    ]);
    expect(auditCount).toBeGreaterThanOrEqual(9);
    expect(outboxCount).toBeGreaterThanOrEqual(9);
  });

  async function register(prefix: string): Promise<RegisteredUser> {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const username = `${prefix}-${suffix}`;
    const email = `${username}@dss.test`;
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Register($input: RegisterInput!) {
          register(input: $input) {
            user { id email }
            tokens { accessToken }
          }
        }`,
        variables: {
          input: {
            email,
            username,
            displayName: prefix,
            password: 'dss-test-password',
          },
        },
      })
      .expect(200);
    const result = response.body as {
      data: {
        register: {
          user: { id: string; email: string };
          tokens: { accessToken: string };
        };
      };
    };
    return {
      id: result.data.register.user.id,
      email: result.data.register.user.email,
      accessToken: result.data.register.tokens.accessToken,
    };
  }

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
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
    return (
      response.body as {
        data: { login: { tokens: { accessToken: string } } };
      }
    ).data.login.tokens.accessToken;
  }

  async function graphql(
    token: string,
    operation: { query: string; variables?: Record<string, unknown> },
  ) {
    return request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send(operation)
      .expect(200);
  }

  async function createTitle(
    token: string,
    input: Record<string, unknown>,
  ): Promise<TitleResult> {
    const response = await graphql(token, {
      query: `mutation Create($input: CreateCustomTitleInput!) {
        createCustomTitle(input: $input) {
          id name color badge isActive
        }
      }`,
      variables: { input },
    });
    return (response.body as { data: { createCustomTitle: TitleResult } }).data
      .createCustomTitle;
  }

  async function updateTitle(
    token: string,
    input: Record<string, unknown>,
  ): Promise<TitleResult> {
    const response = await graphql(token, {
      query: `mutation Update($input: UpdateCustomTitleInput!) {
        updateCustomTitle(input: $input) {
          id name color badge isActive
        }
      }`,
      variables: { input },
    });
    return (response.body as { data: { updateCustomTitle: TitleResult } }).data
      .updateCustomTitle;
  }

  async function grantTitle(
    token: string,
    userId: string,
    titleId: string,
    reason: string,
  ): Promise<GrantResult> {
    const response = await graphql(token, {
      query: `mutation Grant($input: GrantCustomTitleInput!) {
        grantCustomTitle(input: $input) {
          id userId selected revokedAt
          title { id name color badge isActive }
        }
      }`,
      variables: { input: { userId, titleId, reason } },
    });
    return (response.body as { data: { grantCustomTitle: GrantResult } }).data
      .grantCustomTitle;
  }

  async function revokeTitle(
    token: string,
    grantId: string,
    reason: string,
  ): Promise<GrantResult> {
    const response = await graphql(token, {
      query: `mutation Revoke($input: RevokeCustomTitleInput!) {
        revokeCustomTitle(input: $input) {
          id userId selected revokedAt
          title { id name color badge isActive }
        }
      }`,
      variables: { input: { grantId, reason } },
    });
    return (response.body as { data: { revokeCustomTitle: GrantResult } }).data
      .revokeCustomTitle;
  }

  async function selectTitle(
    token: string,
    grantId: string,
  ): Promise<GrantResult> {
    const response = await graphql(token, {
      query: `mutation Select($grantId: ID!) {
        selectCustomTitle(grantId: $grantId) {
          id userId selected revokedAt
          title { id name color badge isActive }
        }
      }`,
      variables: { grantId },
    });
    return (response.body as { data: { selectCustomTitle: GrantResult } }).data
      .selectCustomTitle;
  }

  async function updateCooldown(token: string, days: number): Promise<void> {
    const response = await graphql(token, {
      query: `mutation Settings($input: UpdateCustomTitleSettingsInput!) {
        updateCustomTitleSettings(input: $input) {
          selectionCooldownDays updatedById
        }
      }`,
      variables: { input: { selectionCooldownDays: days } },
    });
    expect(response.body).toMatchObject({
      data: {
        updateCustomTitleSettings: { selectionCooldownDays: days },
      },
    });
  }

  async function userTitles(
    token: string,
    userId: string,
  ): Promise<GrantResult[]> {
    const response = await graphql(token, {
      query: `query UserTitles($userId: ID!) {
        userCustomTitles(userId: $userId) {
          id userId selected revokedAt
          title { id name color badge isActive }
        }
      }`,
      variables: { userId },
    });
    return (response.body as { data: { userCustomTitles: GrantResult[] } }).data
      .userCustomTitles;
  }

  async function activeTitles(token: string): Promise<TitleResult[]> {
    const response = await graphql(token, {
      query: `query { customTitles { id name color badge isActive } }`,
    });
    return (response.body as { data: { customTitles: TitleResult[] } }).data
      .customTitles;
  }

  async function allTitles(token: string): Promise<TitleResult[]> {
    const response = await graphql(token, {
      query: `query { customTitlesAdmin { id name color badge isActive } }`,
    });
    return (response.body as { data: { customTitlesAdmin: TitleResult[] } })
      .data.customTitlesAdmin;
  }
});

/**
 * The test awards two badges and confirms neither can delete its own past.
 */
