/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: C2.2 Owner Boundary Characterization
 * 📄 File: apps/api/test/levels-distinct-event-order.characterization.e2e-spec.ts
 * 🎯 Purpose: Measures distinct-event synchronization after a real balance read.
 * 🧠 Responsibilities: Orders two actual Points effects without sleeps or Auth mocks.
 * 🏗️ Architecture: Real API graph and migrated owned schema; test-only scheduling barrier.
 * ⚠️ Important: Documents current stale history, not a runtime correction or queue proof.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { IntegrationEventJob } from '@dss/jobs';
import { PrismaService } from '@api/core/database';
import { AppModule } from '../src/app.module';
import {
  LEVEL_POINTS_BALANCE_READER,
  type LevelPointsBalanceReader,
} from '../src/modules/levels';
import { CommunityPointsService } from '../src/modules/community-points/application/services/community-points.service';
import { LevelsService } from '../src/modules/levels/application/services/levels.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, resolve: () => release() };
}

describe('C2.2 distinct Levels event order (characterization)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let points: CommunityPointsService;
  let levels: LevelsService;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const context = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = context.createNestApplication();
    await app.init();
    points = app.get(CommunityPointsService);
    levels = app.get(LevelsService);
  }, 60000);
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  afterEach(() => jest.restoreAllMocks());

  async function award(
    userId: string,
    amount: number,
  ): Promise<IntegrationEventJob> {
    await fixture.prisma.communityPointRule.update({
      where: { key: 'reputation.positive' },
      data: { points: amount, dailyLimit: null, enabled: true },
    });
    const result = await points.consume({
      eventId: randomUUID(),
      eventName: 'reputation.direct.changed.v1',
      eventVersion: 1,
      category: 'integration',
      producer: 'dss.api.reputation',
      aggregateType: 'ReputationEntry',
      aggregateId: randomUUID(),
      actorId: userId,
      payload: { recipientId: userId, value: 1 },
      occurredAt: new Date().toISOString(),
    });
    expect(result.status).toBe('AWARDED');
    if (!result.entry) throw new Error('Actual Points award missing.');
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: result.entry.id,
        eventName: 'community-points.awarded.v1',
      },
    });
    return {
      eventId: event.id,
      eventName: event.eventName,
      eventVersion: event.eventVersion,
      category: 'integration',
      producer: event.producer,
      aggregateType: 'CommunityPointEntry',
      aggregateId: result.entry.id,
      payload: event.payload,
      occurredAt: event.occurredAt.toISOString(),
    };
  }

  it('can append stale downward transitions after a newer distinct event completed', async () => {
    const userId = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@dss.test`,
        username: userId,
        passwordHash: 'synthetic-not-login-evidence',
        status: 'ACTIVE',
      },
    });
    const earlier = await award(userId, 10);
    const balance = app.get<LevelPointsBalanceReader>(
      LEVEL_POINTS_BALANCE_READER,
    );
    const original = balance.balance.bind(
      balance,
    ) as LevelPointsBalanceReader['balance'];
    const captured = barrier();
    const release = barrier();
    let capturedBalance: number | undefined;
    jest.spyOn(balance, 'balance').mockImplementationOnce(async (subjectId) => {
      const snapshot = await original(subjectId);
      capturedBalance = snapshot;
      captured.resolve();
      await release.promise;
      return snapshot;
    });
    const pending = levels.consume(earlier);
    try {
      await Promise.race([
        captured.promise,
        pending.then(() => {
          throw new Error(
            'First consume completed before the balance barrier.',
          );
        }),
      ]);
      expect(capturedBalance).toBe(10);
      const later = await award(userId, 110);
      expect(later.eventId).not.toBe(earlier.eventId);
      expect(await points.balance(userId)).toBe(120);
      const fresh = await levels.consume(later);
      expect(fresh.transitions.map((item) => item.toLevel)).toEqual([1, 2, 3]);
      expect(
        fresh.transitions.every((item) => item.sourceEventId === later.eventId),
      ).toBe(true);
      release.resolve();
      const stale = await pending;
      expect(
        stale.transitions.every(
          (item) => item.sourceEventId === earlier.eventId,
        ),
      ).toBe(true);
      expect(
        stale.transitions.map((item) => ({
          from: item.fromLevel,
          to: item.toLevel,
          balance: item.balance,
        })),
      ).toEqual([
        { from: 3, to: 2, balance: 10 },
        { from: 2, to: 1, balance: 10 },
      ]);
      expect(await levels.progress(userId)).toMatchObject({
        balance: 120,
        currentLevel: 3,
      });
      expect(
        await fixture.prisma.processedEvent.count({
          where: {
            consumerName: 'dss.api.levels',
            eventId: { in: [earlier.eventId, later.eventId] },
          },
        }),
      ).toBe(2);
      expect(
        await fixture.prisma.levelTransition.count({ where: { userId } }),
      ).toBe(5);
    } finally {
      release.resolve();
      await pending;
    }
  });

  it('keeps sequential distinct-event history aligned without the delayed read', async () => {
    const userId = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@dss.test`,
        username: userId,
        passwordHash: 'synthetic-not-login-evidence',
        status: 'ACTIVE',
      },
    });
    const earlier = await award(userId, 10);
    expect(
      (await levels.consume(earlier)).transitions.map((item) => item.toLevel),
    ).toEqual([1]);
    const later = await award(userId, 110);
    expect(
      (await levels.consume(later)).transitions.map((item) => item.toLevel),
    ).toEqual([2, 3]);
    expect(await levels.progress(userId)).toMatchObject({
      balance: 120,
      currentLevel: 3,
    });
    expect(
      await fixture.prisma.levelTransition.count({
        where: { userId, direction: 'DOWN' },
      }),
    ).toBe(0);
    expect(
      await fixture.prisma.levelTransition.count({ where: { userId } }),
    ).toBe(3);
  });
});

// A queue can change arrival order. It cannot make an old balance young again.
