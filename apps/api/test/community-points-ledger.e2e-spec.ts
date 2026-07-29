/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points E2E
 * 📄 File: apps/api/test/community-points-ledger.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies idempotent awards, daily caps, GraphQL history, reversals and
 * PostgreSQL immutability.
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

type RegisteredUser = {
  id: string;
  email: string;
  accessToken: string;
};

describe('Community Points Ledger (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let points: CommunityPointsService;

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
  });

  afterAll(async () => {
    await prisma.outboxEvent.deleteMany({
      where: { producer: 'dss.api.community-points' },
    });
    await app.close();
  });

  it('keeps event awards idempotent, capped, explainable and reversible', async () => {
    const user = await register('points-user');
    const moderator = await register('points-moderator');
    await prisma.communityPointRule.update({
      where: { key: 'reputation.positive' },
      data: { dailyLimit: 2, points: 10, enabled: true },
    });

    const firstEvent = reputationEvent(
      user.id,
      `event-points-1-${user.id}`,
      `source-1-${user.id}`,
    );
    const concurrent = await Promise.all([
      points.consume(firstEvent),
      points.consume(firstEvent),
    ]);
    expect(concurrent.map((result) => result.status).sort()).toEqual([
      'AWARDED',
      'DUPLICATE',
    ]);
    const firstEntry = concurrent.find((result) => result.entry)?.entry;
    expect(firstEntry).toMatchObject({
      userId: user.id,
      points: 10,
      ruleKey: 'reputation.positive',
      sourceId: `source-1-${user.id}`,
    });

    await expect(
      points.consume(
        reputationEvent(
          user.id,
          `event-points-2-${user.id}`,
          `source-2-${user.id}`,
        ),
      ),
    ).resolves.toMatchObject({ status: 'AWARDED' });
    await expect(
      points.consume(
        reputationEvent(
          user.id,
          `event-points-3-${user.id}`,
          `source-3-${user.id}`,
        ),
      ),
    ).resolves.toEqual({ status: 'CAPPED', entry: null });
    await expect(points.consume(firstEvent)).resolves.toEqual({
      status: 'DUPLICATE',
      entry: null,
    });

    const historyBefore = await history(user.id, user.accessToken);
    expect(historyBefore).toMatchObject({
      balance: 20,
      total: 2,
    });
    expect(
      (
        historyBefore.items as Array<{
          reason: string;
          sourceType: string;
          reversal: unknown;
        }>
      )[0],
    ).toMatchObject({
      reason: 'Community activity reward: reputation.positive.',
      sourceType: 'ReputationEntry',
      reversal: null,
    });

    const permissions = await prisma.permission.findMany({
      where: {
        key: {
          in: ['community-points.reverse', 'community-points.settings.manage'],
        },
      },
      select: { id: true },
    });
    expect(permissions).toHaveLength(2);
    await prisma.userPermission.createMany({
      data: permissions.map((permission) => ({
        userId: moderator.id,
        permissionId: permission.id,
      })),
    });
    const moderatorToken = await login(moderator.email);
    const entryId = firstEntry?.id;
    expect(entryId).toBeDefined();

    const reversed = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({
        query: `mutation Reverse($input: ReverseCommunityPointsInput!) {
          reverseCommunityPoints(input: $input) {
            id points reason userId actorId
          }
        }`,
        variables: {
          input: {
            entryId,
            reason: 'Source activity was invalidated by moderation.',
          },
        },
      })
      .expect(200);
    expect(reversed.body).toMatchObject({
      data: {
        reverseCommunityPoints: {
          points: -10,
          userId: user.id,
          actorId: moderator.id,
          reason: 'Source activity was invalidated by moderation.',
        },
      },
    });

    const updatedRule = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({
        query: `mutation Update($input: UpdateCommunityPointRuleInput!) {
          updateCommunityPointRule(input: $input) {
            key points dailyLimit enabled updatedById
          }
        }`,
        variables: {
          input: {
            key: 'reputation.positive',
            points: 12,
            dailyLimit: null,
            enabled: true,
          },
        },
      })
      .expect(200);
    expect(updatedRule.body).toMatchObject({
      data: {
        updateCommunityPointRule: {
          key: 'reputation.positive',
          points: 12,
          dailyLimit: null,
          enabled: true,
          updatedById: moderator.id,
        },
      },
    });

    const historyAfter = await history(user.id, user.accessToken);
    expect(historyAfter).toMatchObject({
      balance: 10,
      total: 2,
    });
    expect(
      (
        historyAfter.items as Array<{
          id: string;
          reversal: { actorId: string; reason: string } | null;
        }>
      ).find((item) => item.id === entryId)?.reversal,
    ).toEqual({
      actorId: moderator.id,
      reason: 'Source activity was invalidated by moderation.',
    });

    await expect(
      prisma.communityPointEntry.update({
        where: { id: entryId },
        data: { reason: 'Rewritten scoreboard history' },
      }),
    ).rejects.toThrow('community points ledger entries are immutable');

    const reorderedUser = await register('points-reordered');
    await expect(
      points.consume({
        ...reputationEvent(
          reorderedUser.id,
          `event-reversal-first-${reorderedUser.id}`,
          `reversal-record-${reorderedUser.id}`,
        ),
        eventName: 'reputation.direct.reversed.v1',
        aggregateId: `reversal-record-${reorderedUser.id}`,
        payload: {
          reversesEntryId: `source-arrives-late-${reorderedUser.id}`,
        },
      }),
    ).resolves.toEqual({ status: 'AWARDED', entry: null });
    await expect(
      points.consume(
        reputationEvent(
          reorderedUser.id,
          `event-source-late-${reorderedUser.id}`,
          `source-arrives-late-${reorderedUser.id}`,
        ),
      ),
    ).resolves.toEqual({ status: 'IGNORED', entry: null });
    await expect(
      history(reorderedUser.id, reorderedUser.accessToken),
    ).resolves.toMatchObject({ balance: 0, total: 0 });
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

  async function history(userId: string, accessToken: string) {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `query History($userId: ID!) {
          communityPointsHistory(userId: $userId) {
            balance total
            items {
              id points reason sourceType
              reversal { actorId reason }
            }
          }
        }`,
        variables: { userId },
      })
      .expect(200);
    return (
      response.body as {
        data: {
          communityPointsHistory: {
            balance: number;
            total: number;
            items: unknown[];
          };
        };
      }
    ).data.communityPointsHistory;
  }
});

/**
 * PostgreSQL keeps the scorebook in ink. Reversals use another line.
 */
