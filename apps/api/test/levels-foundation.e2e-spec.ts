/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Levels E2E
 * 📄 File: apps/api/test/levels-foundation.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies derived progress, multi-level transitions, downward corrections,
 * GraphQL settings and immutable PostgreSQL history.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { IntegrationEventJob } from '@dss/jobs';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/database';
import { CommunityPointsService } from './../src/modules/community-points';
import { LevelsService } from './../src/modules/levels';

type RegisteredUser = {
  id: string;
  email: string;
  accessToken: string;
};

describe('Levels foundation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let points: CommunityPointsService;
  let levels: LevelsService;

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
    points = app.get(CommunityPointsService);
    levels = app.get(LevelsService);
  });

  afterAll(async () => {
    await prisma.outboxEvent.deleteMany({
      where: {
        producer: {
          in: ['dss.api.community-points', 'dss.api.levels'],
        },
      },
    });
    await app.close();
  });

  it('derives progress and preserves every upward and downward crossing', async () => {
    const user = await register('levels-user');
    const admin = await register('levels-admin');
    await prisma.communityPointRule.update({
      where: { key: 'reputation.positive' },
      data: { points: 120, dailyLimit: null, enabled: true },
    });

    const award = await points.consume(
      reputationEvent(
        user.id,
        `levels-source-event-${user.id}`,
        `levels-source-${user.id}`,
      ),
    );
    expect(award).toMatchObject({
      status: 'AWARDED',
      entry: { userId: user.id, points: 120 },
    });
    const levelUpEvent = levelEvent(
      user.id,
      `levels-up-event-${user.id}`,
      'community-points.awarded.v1',
    );
    const concurrent = await Promise.all([
      levels.consume(levelUpEvent),
      levels.consume(levelUpEvent),
    ]);
    expect(concurrent.filter((result) => result.duplicate)).toHaveLength(1);
    const levelUps = concurrent.find((result) => !result.duplicate);
    expect(
      levelUps?.transitions.map((transition) => transition.toLevel),
    ).toEqual([1, 2, 3]);

    const progressUp = await progress(user.id, user.accessToken);
    expect(progressUp).toMatchObject({
      balance: 120,
      currentLevel: 3,
      currentThreshold: 100,
      nextLevel: 4,
      nextThreshold: 200,
      pointsIntoLevel: 20,
      pointsNeeded: 80,
      progressPercent: 20,
    });

    const originalEntryId = award.entry?.id;
    expect(originalEntryId).toBeDefined();
    await points.reverse(
      originalEntryId as string,
      admin.id,
      'The source activity was invalidated.',
    );
    const levelDown = await levels.consume(
      levelEvent(
        user.id,
        `levels-down-event-${user.id}`,
        'community-points.reversed.v1',
      ),
    );
    expect(
      levelDown.transitions.map((transition) => transition.toLevel),
    ).toEqual([2, 1, 0]);

    const progressDown = await progress(user.id, user.accessToken);
    expect(progressDown).toMatchObject({
      balance: 0,
      currentLevel: 0,
      currentThreshold: 0,
      nextLevel: 1,
      nextThreshold: 10,
      pointsIntoLevel: 0,
      pointsNeeded: 10,
      progressPercent: 0,
    });

    const history = await levelHistory(user.id, user.accessToken);
    expect(history.total).toBe(6);
    expect(
      history.items.filter((item) => item.direction === 'UP'),
    ).toHaveLength(3);
    expect(
      history.items.filter((item) => item.direction === 'DOWN'),
    ).toHaveLength(3);

    const permission = await prisma.permission.findUniqueOrThrow({
      where: { key: 'levels.settings.manage' },
    });
    await prisma.userPermission.create({
      data: { userId: admin.id, permissionId: permission.id },
    });
    const adminToken = await login(admin.email);
    const updated = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        query: `mutation Update($input: UpdateLevelDefinitionInput!) {
          updateLevelDefinition(input: $input) {
            level threshold updatedById
          }
        }`,
        variables: { input: { level: 2, threshold: 60 } },
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      data: {
        updateLevelDefinition: {
          level: 2,
          threshold: 60,
          updatedById: admin.id,
        },
      },
    });

    const transitionId = history.items[0]?.id;
    expect(transitionId).toBeDefined();
    await expect(
      prisma.levelTransition.update({
        where: { id: transitionId },
        data: { balance: 999_999 },
      }),
    ).rejects.toThrow('level transition history is immutable');
  });

  function reputationEvent(
    userId: string,
    eventId: string,
    sourceId: string,
  ): IntegrationEventJob {
    return {
      eventId,
      eventName: 'reputation.direct.changed.v1',
      eventVersion: 1,
      category: 'integration',
      producer: 'dss.api.reputation',
      aggregateType: 'ReputationEntry',
      aggregateId: sourceId,
      actorId: userId,
      payload: { recipientId: userId, value: 1 },
      occurredAt: new Date().toISOString(),
    };
  }

  function levelEvent(
    userId: string,
    eventId: string,
    eventName: string,
  ): IntegrationEventJob {
    return {
      eventId,
      eventName,
      eventVersion: 1,
      category: 'integration',
      producer: 'dss.api.community-points',
      aggregateType: 'CommunityPointEntry',
      aggregateId: eventId,
      payload: { userId },
      occurredAt: new Date().toISOString(),
    };
  }

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

  async function progress(userId: string, accessToken: string) {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `query Progress($userId: ID!) {
          levelProgress(userId: $userId) {
            balance currentLevel currentThreshold nextLevel nextThreshold
            pointsIntoLevel pointsNeeded progressPercent
          }
        }`,
        variables: { userId },
      })
      .expect(200);
    return (
      response.body as {
        data: { levelProgress: Record<string, unknown> };
      }
    ).data.levelProgress;
  }

  async function levelHistory(userId: string, accessToken: string) {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `query History($userId: ID!) {
          levelHistory(userId: $userId) {
            total
            items { id fromLevel toLevel direction balance sourceEventName }
          }
        }`,
        variables: { userId },
      })
      .expect(200);
    return (
      response.body as {
        data: {
          levelHistory: {
            total: number;
            items: Array<{
              id: string;
              direction: 'UP' | 'DOWN';
            }>;
          };
        };
      }
    ).data.levelHistory;
  }
});

/**
 * The test climbs three levels and descends safely. No parachute mocks needed.
 */
