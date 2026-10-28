/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Runtime Integration Verification
 * 📄 File: apps/api/test/gamification-runtime-assembly.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies isolated owner runtime composition against a migrated owned schema.
 *
 * 🧠 Responsibilities:
 * • checks real database lifecycle without HTTP or queue startup;
 * • exercises explicit public consumption and unchanged owner idempotency.
 *
 * 🏗️ Architecture:
 * Test-only headless Nest context with disposable schema isolation.
 *
 * ⚠️ Important:
 * Explicit test calls are not producer-to-queue delivery or activation proof.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModulesContainer } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { IntegrationEventJob } from '@dss/jobs';
import { PrismaService } from '@api/core/database';
import {
  COMMUNITY_POINTS_EVENT_CONSUMER,
  COMMUNITY_POINTS_BALANCE_READER,
  type CommunityPointsEventConsumer,
  type CommunityPointsBalanceReader,
} from '@api/modules/community-points';
import {
  LEVEL_EVENT_CONSUMER,
  type LevelEventConsumer,
} from '@api/modules/levels';
import {
  ACHIEVEMENT_EVENT_CONSUMER,
  type AchievementEventConsumer,
} from '@api/modules/achievements';
import { GamificationConsumerCompositionModule } from '../src/composition/gamification/gamification-consumer-composition.module';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: new ConfigService({
        DATABASE_URL: process.env.DATABASE_URL,
        NODE_ENV: 'test',
      }),
    },
  ],
  exports: [ConfigService],
})
class RuntimeTestConfigurationModule {}

describe('Gamification owner runtime assembly (explicit calls, no automatic delivery)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let context: TestingModule;
  let startupBefore: Awaited<ReturnType<typeof counts>>;
  let startupAfter: Awaited<ReturnType<typeof counts>>;
  async function counts() {
    return {
      points: await fixture.prisma.communityPointEntry.count(),
      audit: await fixture.prisma.auditRecord.count(),
      outbox: await fixture.prisma.outboxEvent.count(),
      markers: await fixture.prisma.processedEvent.count(),
      achievements: await fixture.prisma.achievementAward.count(),
    };
  }
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    startupBefore = await counts();
    context = await Test.createTestingModule({
      imports: [
        RuntimeTestConfigurationModule,
        GamificationConsumerCompositionModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    await context.init();
    startupAfter = await counts();
  }, 60000);
  afterAll(async () => {
    try {
      await context?.close();
    } finally {
      await fixture?.close();
    }
  });

  it('opens a healthy owned database context without starting presentation or automatic effects', async () => {
    expect(context.get(PrismaService)).toBe(fixture.prisma);
    await expect(fixture.prisma.healthCheck()).resolves.toMatchObject({
      status: 'up',
    });
    expect(startupAfter).toEqual(startupBefore);
    const names = [...context.get(ModulesContainer).values()].map(
      ({ metatype }) => metatype.name,
    );
    for (const forbidden of [
      'AppModule',
      'UsersModule',
      'CustomTitlesModule',
      'GraphQLModule',
      'QueueModule',
      'RedisModule',
      'ScheduleModule',
      'GamificationIntegrationModule',
    ]) {
      expect(names).not.toContain(forbidden);
    }
  });

  it('uses real owner rules and atomic effect/marker/audit/outbox dedup through the public command', async () => {
    const userId = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@dss.invalid`,
        username: userId,
        passwordHash: 'synthetic-not-a-login',
        status: 'ACTIVE',
      },
    });
    const event: IntegrationEventJob = {
      eventId: randomUUID(),
      eventName: 'comments.comment.created.v1',
      eventVersion: 1,
      category: 'integration',
      producer: 'synthetic.runtime-assembly',
      payload: { authorId: userId },
      aggregateType: 'Comment',
      aggregateId: randomUUID(),
      occurredAt: new Date().toISOString(),
    };
    const before = await counts();
    const consumer = context.get<CommunityPointsEventConsumer>(
      COMMUNITY_POINTS_EVENT_CONSUMER,
    );
    await expect(consumer.consume(event)).resolves.toBeUndefined();
    const awarded = await counts();
    expect(awarded).toEqual({
      points: before.points + 1,
      audit: before.audit + 1,
      outbox: before.outbox + 1,
      markers: before.markers + 1,
      achievements: before.achievements,
    });
    const entries = await fixture.prisma.communityPointEntry.findMany({
      where: { userId },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      points: 1,
      sourceEventId: event.eventId,
    });
    await expect(
      context
        .get<CommunityPointsBalanceReader>(COMMUNITY_POINTS_BALANCE_READER)
        .balance(userId),
    ).resolves.toBe(1);
    await expect(consumer.consume(event)).resolves.toBeUndefined();
    expect(await counts()).toEqual(awarded);
  });

  it('keeps each owner no-op rule without introducing a shared policy or an effect', async () => {
    const event: IntegrationEventJob = {
      eventId: randomUUID(),
      eventName: 'synthetic.runtime.unsupported.v1',
      eventVersion: 1,
      category: 'integration',
      producer: 'synthetic.runtime-assembly',
      payload: {},
      occurredAt: new Date().toISOString(),
    };
    const before = await counts();
    await expect(
      context
        .get<CommunityPointsEventConsumer>(COMMUNITY_POINTS_EVENT_CONSUMER)
        .consume(event),
    ).resolves.toBeUndefined();
    await expect(
      context.get<LevelEventConsumer>(LEVEL_EVENT_CONSUMER).consume(event),
    ).resolves.toBeUndefined();
    await expect(
      context
        .get<AchievementEventConsumer>(ACHIEVEMENT_EVENT_CONSUMER)
        .consume(event),
    ).resolves.toBeUndefined();
    expect(await counts()).toEqual(before);
  });
});
