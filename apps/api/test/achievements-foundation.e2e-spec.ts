/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements E2E
 * 📄 File: apps/api/test/achievements-foundation.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies event awards, idempotency, caps, manual awards, and rollback.
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
import { AchievementsService } from './../src/modules/achievements';

type RegisteredUser = {
  id: string;
  email: string;
  accessToken: string;
};

type Definition = {
  id: string;
  key: string;
  name: string;
  badge: string;
  isActive: boolean;
};

type Rule = {
  id: string;
  achievementId: string;
  eventName: string;
  repeatable: boolean;
  cooldownHours: number;
  dailyCap: number | null;
};

type Award = {
  id: string;
  kind: 'RULE' | 'MANUAL';
  sourceId: string | null;
  revocation: { reason: string } | null;
  achievement: Definition;
};

describe('Achievements foundation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let achievements: AchievementsService;

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
    achievements = app.get(AchievementsService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.outboxEvent.deleteMany({
        where: { producer: 'dss.api.achievements' },
      });
    }
    if (app) await app.close();
  });

  it('awards semantic events and preserves reversible evidence', async () => {
    const user = await register('achievement-user');
    const admin = await register('achievement-admin');
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { key: 'achievements.manage' },
    });
    await prisma.userPermission.create({
      data: { userId: admin.id, permissionId: permission.id },
    });
    const adminToken = await login(admin.email);
    const suffix = user.id.slice(0, 8);

    const firstTopic = await saveDefinition(adminToken, {
      key: `community.first-topic-${suffix}`,
      name: `Перший політ ${suffix}`,
      description: 'Published a first Community Hub topic.',
      color: '#7C3AED',
      badge: 'rocket',
      isActive: true,
    });
    const firstTopicRule = await saveRule(adminToken, {
      achievementId: firstTopic.id,
      eventName: 'community.topic.published.v1',
      recipientPayloadKey: 'authorId',
      repeatable: false,
      cooldownHours: 0,
      dailyCap: null,
      enabled: true,
    });

    const firstEvent = achievementEvent(
      user.id,
      `achievement-event-${suffix}-1`,
      `topic-${suffix}-1`,
    );
    const concurrent = await Promise.all([
      achievements.consume(firstEvent),
      achievements.consume(firstEvent),
    ]);
    expect(
      concurrent
        .flat()
        .map((result) => result.status)
        .sort(),
    ).toEqual(['AWARDED', 'DUPLICATE']);

    const secondEvent = achievementEvent(
      user.id,
      `achievement-event-${suffix}-2`,
      `topic-${suffix}-2`,
    );
    await expect(achievements.consume(secondEvent)).resolves.toMatchObject([
      { ruleId: firstTopicRule.id, status: 'IGNORED', award: null },
    ]);
    expect(await activeAwards(user.accessToken, user.id)).toHaveLength(1);

    const rollback = await rollbackSource(adminToken, {
      sourceType: 'CommunityTopic',
      sourceId: `topic-${suffix}-1`,
      reason: 'The source topic was removed by moderation.',
    });
    expect(rollback).toHaveLength(1);
    expect(rollback[0]?.revocation?.reason).toContain('removed');
    expect(await activeAwards(user.accessToken, user.id)).toHaveLength(0);

    const thirdEvent = achievementEvent(
      user.id,
      `achievement-event-${suffix}-3`,
      `topic-${suffix}-3`,
    );
    await expect(achievements.consume(thirdEvent)).resolves.toMatchObject([
      { status: 'AWARDED' },
    ]);

    const contributor = await saveDefinition(adminToken, {
      key: `community-contributor-${suffix}`,
      name: `Community Contributor ${suffix}`,
      description: 'Repeatable contribution recognition.',
      color: '#0EA5E9',
      badge: 'sparkles',
      isActive: true,
    });
    await saveRule(adminToken, {
      achievementId: contributor.id,
      eventName: 'community.answer.accepted.v1',
      recipientPayloadKey: 'authorId',
      repeatable: true,
      cooldownHours: 0,
      dailyCap: 1,
      enabled: true,
    });
    const repeatOne = repeatableEvent(
      user.id,
      `achievement-repeat-${suffix}-1`,
      `answer-${suffix}-1`,
    );
    const repeatTwo = repeatableEvent(
      user.id,
      `achievement-repeat-${suffix}-2`,
      `answer-${suffix}-2`,
    );
    await expect(achievements.consume(repeatOne)).resolves.toMatchObject([
      { status: 'AWARDED' },
    ]);
    await expect(achievements.consume(repeatTwo)).resolves.toMatchObject([
      { status: 'CAPPED' },
    ]);
    await achievements.rollbackSource(
      'CommunityAnswer',
      `answer-${suffix}-1`,
      'Accepted answer was invalidated.',
      admin.id,
    );
    const repeatThree = repeatableEvent(
      user.id,
      `achievement-repeat-${suffix}-3`,
      `answer-${suffix}-3`,
    );
    await expect(achievements.consume(repeatThree)).resolves.toMatchObject([
      { status: 'AWARDED' },
    ]);

    const manual = await saveDefinition(adminToken, {
      key: `mission-specialist-${suffix}`,
      name: `Mission Specialist ${suffix}`,
      description: 'Manual recognition.',
      color: '#F59E0B',
      badge: 'medal',
      isActive: true,
    });
    const manualAward = await awardManually(adminToken, {
      userId: user.id,
      achievementId: manual.id,
      reason: 'Outstanding support during the mission.',
    });
    expect(manualAward.kind).toBe('MANUAL');
    const revokedManual = await revokeAward(adminToken, {
      awardId: manualAward.id,
      reason: 'Award was issued to the wrong account.',
    });
    expect(revokedManual.revocation).not.toBeNull();

    const history = await awardHistory(adminToken, user.id);
    expect(history.filter((award) => award.revocation)).toHaveLength(3);
    expect(history.filter((award) => !award.revocation).length).toBeGreaterThan(
      1,
    );

    const immutableAward = history[0];
    expect(immutableAward).toBeDefined();
    await expect(
      prisma.achievementAward.update({
        where: { id: immutableAward?.id },
        data: { reason: 'Rewritten history.' },
      }),
    ).rejects.toThrow('achievement award history is immutable');

    const [auditCount, outboxCount] = await Promise.all([
      prisma.auditRecord.count({
        where: { action: { startsWith: 'achievements.' } },
      }),
      prisma.outboxEvent.count({
        where: { producer: 'dss.api.achievements' },
      }),
    ]);
    expect(auditCount).toBeGreaterThanOrEqual(12);
    expect(outboxCount).toBeGreaterThanOrEqual(12);
  });

  function achievementEvent(
    userId: string,
    eventId: string,
    sourceId: string,
  ): IntegrationEventJob {
    return {
      eventId,
      eventName: 'community.topic.published.v1',
      eventVersion: 1,
      category: 'integration',
      producer: 'dss.api.community',
      aggregateType: 'CommunityTopic',
      aggregateId: sourceId,
      payload: { authorId: userId },
      occurredAt: new Date().toISOString(),
    };
  }

  function repeatableEvent(
    userId: string,
    eventId: string,
    sourceId: string,
  ): IntegrationEventJob {
    return {
      eventId,
      eventName: 'community.answer.accepted.v1',
      eventVersion: 1,
      category: 'integration',
      producer: 'dss.api.community',
      aggregateType: 'CommunityAnswer',
      aggregateId: sourceId,
      payload: { authorId: userId },
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

  async function saveDefinition(
    token: string,
    input: Record<string, unknown>,
  ): Promise<Definition> {
    const response = await graphql(token, {
      query: `mutation Save($input: SaveAchievementInput!) {
        saveAchievement(input: $input) { id key name badge isActive }
      }`,
      variables: { input },
    });
    return (response.body as { data: { saveAchievement: Definition } }).data
      .saveAchievement;
  }

  async function saveRule(
    token: string,
    input: Record<string, unknown>,
  ): Promise<Rule> {
    const response = await graphql(token, {
      query: `mutation SaveRule($input: SaveAchievementRuleInput!) {
        saveAchievementRule(input: $input) {
          id achievementId eventName repeatable cooldownHours dailyCap
        }
      }`,
      variables: { input },
    });
    return (response.body as { data: { saveAchievementRule: Rule } }).data
      .saveAchievementRule;
  }

  async function rollbackSource(
    token: string,
    input: Record<string, unknown>,
  ): Promise<Award[]> {
    const response = await graphql(token, {
      query: `mutation Rollback($input: RollbackAchievementSourceInput!) {
        rollbackAchievementSource(input: $input) {
          id kind sourceId revocation { reason }
          achievement { id key name badge isActive }
        }
      }`,
      variables: { input },
    });
    return (
      response.body as {
        data: { rollbackAchievementSource: Award[] };
      }
    ).data.rollbackAchievementSource;
  }

  async function awardManually(
    token: string,
    input: Record<string, unknown>,
  ): Promise<Award> {
    const response = await graphql(token, {
      query: `mutation Award($input: ManualAchievementAwardInput!) {
        awardAchievement(input: $input) {
          id kind sourceId revocation { reason }
          achievement { id key name badge isActive }
        }
      }`,
      variables: { input },
    });
    return (response.body as { data: { awardAchievement: Award } }).data
      .awardAchievement;
  }

  async function revokeAward(
    token: string,
    input: Record<string, unknown>,
  ): Promise<Award> {
    const response = await graphql(token, {
      query: `mutation Revoke($input: RevokeAchievementAwardInput!) {
        revokeAchievementAward(input: $input) {
          id kind sourceId revocation { reason }
          achievement { id key name badge isActive }
        }
      }`,
      variables: { input },
    });
    return (response.body as { data: { revokeAchievementAward: Award } }).data
      .revokeAchievementAward;
  }

  async function activeAwards(token: string, userId: string): Promise<Award[]> {
    const response = await graphql(token, {
      query: `query Awards($userId: ID!) {
        userAchievements(userId: $userId) {
          id kind sourceId revocation { reason }
          achievement { id key name badge isActive }
        }
      }`,
      variables: { userId },
    });
    return (response.body as { data: { userAchievements: Award[] } }).data
      .userAchievements;
  }

  async function awardHistory(token: string, userId: string): Promise<Award[]> {
    const response = await graphql(token, {
      query: `query History($userId: ID!) {
        userAchievementHistory(userId: $userId) {
          id kind sourceId revocation { reason }
          achievement { id key name badge isActive }
        }
      }`,
      variables: { userId },
    });
    return (
      response.body as {
        data: { userAchievementHistory: Award[] };
      }
    ).data.userAchievementHistory;
  }
});

/**
 * This suite earns badges honestly, then asks moderation to check the receipts.
 */
