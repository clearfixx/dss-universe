/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Composition Verification
 * 📄 File: apps/api/src/composition/gamification/gamification-runtime-assembly.spec.ts
 *
 * 🎯 Purpose:
 * Verifies real Nest assembly, private provider reuse and narrow consumption.
 *
 * 🧠 Responsibilities:
 * • checks isolated runtime and combined API/runtime owner graphs;
 * • preserves command delegation, error identity and database lifecycle.
 *
 * 🏗️ Architecture:
 * Composition tests with real owner providers and a lifecycle-aware database stub.
 *
 * ⚠️ Important:
 * No queue or real database is used; migrated integration proves real persistence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModulesContainer } from '@nestjs/core';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import type { IntegrationEventJob } from '@dss/jobs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from '@api/core/database';
import {
  CommunityPointsModule,
  CommunityPointsRuntimeModule,
  COMMUNITY_POINTS_EVENT_CONSUMER,
  COMMUNITY_POINTS_BALANCE_READER,
  POINTS_RECIPIENT_EXISTENCE,
  type CommunityPointsBalanceReader,
} from '@api/modules/community-points';
import {
  LevelsModule,
  LevelsRuntimeModule,
  LEVEL_EVENT_CONSUMER,
  LEVEL_RECIPIENT_EXISTENCE,
} from '@api/modules/levels';
import {
  AchievementsModule,
  AchievementsRuntimeModule,
  ACHIEVEMENT_EVENT_CONSUMER,
  ACHIEVEMENT_RECIPIENT_EXISTENCE,
  MANUAL_AWARD_TRANSACTION,
} from '@api/modules/achievements';
import { CommunityPointsService } from '@api/modules/community-points/application/services/community-points.service';
import { LevelsService } from '@api/modules/levels/application/services/levels.service';
import { AchievementsService } from '@api/modules/achievements/application/services/achievements.service';
import { PrismaCommunityPointsRepository } from '@api/modules/community-points/infrastructure/repositories/prisma-community-points.repository';
import { PrismaLevelsRepository } from '@api/modules/levels/infrastructure/repositories/prisma-levels.repository';
import { PrismaAchievementsRepository } from '@api/modules/achievements/infrastructure/repositories/prisma-achievements.repository';
import { PrismaProfileExistenceReader } from '@api/modules/users/infrastructure/repositories/prisma-profile-existence.reader';
import { GamificationConsumerCompositionModule } from './gamification-consumer-composition.module';
import { PrismaManualAwardTransaction } from './infrastructure/prisma-manual-award.transaction';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: new ConfigService({
        DATABASE_URL: 'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test',
        NODE_ENV: 'test',
      }),
    },
  ],
  exports: [ConfigService],
})
class TestConfigurationModule {}

function databaseStub() {
  return {
    onModuleInit: jest.fn((): Promise<void> => Promise.resolve()),
    onModuleDestroy: jest.fn((): Promise<void> => Promise.resolve()),
    user: {
      findUnique: jest.fn(
        (): Promise<{ id: string } | null> =>
          Promise.resolve({ id: 'subject' }),
      ),
    },
    communityPointEntry: {
      aggregate: jest.fn(() => Promise.resolve({ _sum: { points: 12 } })),
    },
    $transaction: jest.fn(() => {
      throw new Error('Unexpected bootstrap transaction');
    }),
  };
}

async function assemble(
  database: ReturnType<typeof databaseStub> | PrismaService,
  includeApi = false,
) {
  return Test.createTestingModule({
    imports: [
      TestConfigurationModule,
      GamificationConsumerCompositionModule,
      ...(includeApi
        ? [CommunityPointsModule, LevelsModule, AchievementsModule]
        : []),
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(database)
    .compile();
}

type Consumer = { consume(event: IntegrationEventJob): Promise<void> };
type Owner = { consume(event: IntegrationEventJob): Promise<unknown> };

describe('gamification runtime assembly', () => {
  let context: TestingModule;
  let database: ReturnType<typeof databaseStub>;
  beforeEach(async () => {
    database = databaseStub();
    context = await assemble(database);
    await context.init();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await context?.close();
    expect(database.onModuleDestroy).toHaveBeenCalledTimes(1);
  });

  it('starts only owner runtimes and one database lifecycle, without automatic work', () => {
    const modules = [...context.get(ModulesContainer).values()];
    const names = modules.map(({ metatype }) => metatype.name);
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
    const providerNames = modules
      .flatMap(({ providers }) => [...providers.values()])
      .map(({ metatype }) => metatype?.name ?? '');
    expect(
      providerNames.filter((name) =>
        /Resolver$|Controller$|OutboxDispatcher|QueueRegistry|Processor$/.test(
          name,
        ),
      ),
    ).toEqual([]);
    expect(database.onModuleInit).toHaveBeenCalledTimes(1);
    expect(database.$transaction).not.toHaveBeenCalled();
    expect(database.user.findUnique).not.toHaveBeenCalled();
    expect(database.communityPointEntry.aggregate).not.toHaveBeenCalled();
    expect(context.get(MANUAL_AWARD_TRANSACTION)).toBeInstanceOf(
      PrismaManualAwardTransaction,
    );
  });

  it('exports only named runtime commands and the existing Points scalar reader', () => {
    expect(
      Reflect.getMetadata(
        MODULE_METADATA.EXPORTS,
        CommunityPointsRuntimeModule,
      ),
    ).toEqual([
      COMMUNITY_POINTS_EVENT_CONSUMER,
      COMMUNITY_POINTS_BALANCE_READER,
    ]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, LevelsRuntimeModule),
    ).toEqual([LEVEL_EVENT_CONSUMER]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, AchievementsRuntimeModule),
    ).toEqual([ACHIEVEMENT_EVENT_CONSUMER]);
    const recipients = context.get<{ exists(id: string): Promise<boolean> }>(
      POINTS_RECIPIENT_EXISTENCE,
    );
    expect(context.get(LEVEL_RECIPIENT_EXISTENCE)).toBe(recipients);
    expect(context.get(ACHIEVEMENT_RECIPIENT_EXISTENCE)).toBe(recipients);
  });

  it('reads ID-only recipient existence freshly and propagates unavailable facts', async () => {
    const recipients = context.get<{ exists(id: string): Promise<boolean> }>(
      POINTS_RECIPIENT_EXISTENCE,
    );
    await expect(recipients.exists('subject')).resolves.toBe(true);
    database.user.findUnique.mockResolvedValueOnce(null);
    await expect(recipients.exists('subject')).resolves.toBe(false);
    const failure = new Error('synthetic profile read failure');
    database.user.findUnique.mockRejectedValueOnce(failure);
    await expect(recipients.exists('subject')).rejects.toBe(failure);
    expect(database.user.findUnique.mock.calls).toEqual([
      [{ where: { id: 'subject' }, select: { id: true } }],
      [{ where: { id: 'subject' }, select: { id: true } }],
      [{ where: { id: 'subject' }, select: { id: true } }],
    ]);
  });

  // Facades never cache a prior successful owner decision.
  const cases = [
    {
      name: 'Points',
      token: COMMUNITY_POINTS_EVENT_CONSUMER,
      service: CommunityPointsService,
      result: { status: 'IGNORED', entry: null },
    },
    {
      name: 'Levels',
      token: LEVEL_EVENT_CONSUMER,
      service: LevelsService,
      result: { duplicate: false, transitions: [] },
    },
    {
      name: 'Achievements',
      token: ACHIEVEMENT_EVENT_CONSUMER,
      service: AchievementsService,
      result: [],
    },
  ];
  for (const spec of cases) {
    it(`${spec.name} delegates each call to its owner and exposes no internal return value`, async () => {
      const service = context.get<Owner>(spec.service);
      const consume = jest
        .spyOn(service, 'consume')
        .mockResolvedValue(spec.result);
      const capability = context.get<Consumer>(spec.token);
      const event: IntegrationEventJob = {
        eventId: 'opaque-id',
        eventName: 'synthetic.runtime.noop.v1',
        eventVersion: 1,
        category: 'integration',
        producer: 'synthetic.runtime',
        payload: {},
        occurredAt: '2026-10-28T00:00:00.000Z',
      };
      expect(Object.keys(capability)).toEqual(['consume']);
      expect(Object.isFrozen(capability)).toBe(true);
      await expect(capability.consume(event)).resolves.toBeUndefined();
      expect(consume).toHaveBeenCalledTimes(1);
      expect(consume.mock.calls[0][0]).toBe(event);
      const failure = new Error('synthetic owner failure');
      consume.mockRejectedValueOnce(failure);
      await expect(capability.consume(event)).rejects.toBe(failure);
      expect(consume).toHaveBeenCalledTimes(2);
    });
  }

  it('shares concrete owner services, repositories and balance when API/runtime wrappers coexist', async () => {
    const bothDatabase = databaseStub();
    const both = await assemble(bothDatabase, true);
    try {
      await both.init();
      const instances = [...both.get(ModulesContainer).values()].flatMap(
        ({ providers }) =>
          [...providers.values()].map(({ instance }) => instance),
      );
      for (const type of [
        CommunityPointsService,
        LevelsService,
        AchievementsService,
        PrismaCommunityPointsRepository,
        PrismaLevelsRepository,
        PrismaAchievementsRepository,
        PrismaProfileExistenceReader,
      ]) {
        expect(
          new Set(instances.filter((instance) => instance instanceof type))
            .size,
        ).toBe(1);
      }
      const api = both
        .select(CommunityPointsModule)
        .get<CommunityPointsBalanceReader>(COMMUNITY_POINTS_BALANCE_READER, {
          strict: true,
        });
      const runtime = both
        .select(CommunityPointsRuntimeModule)
        .get<CommunityPointsBalanceReader>(COMMUNITY_POINTS_BALANCE_READER, {
          strict: true,
        });
      expect(api).toBe(runtime);
      await expect(runtime.balance('subject')).resolves.toBe(12);
      expect(bothDatabase.communityPointEntry.aggregate).toHaveBeenCalledTimes(
        1,
      );
      expect(bothDatabase.onModuleInit).toHaveBeenCalledTimes(1);
    } finally {
      await both.close();
    }
    expect(bothDatabase.onModuleDestroy).toHaveBeenCalledTimes(1);
  });

  it('cleans failed database initialization before Nest close can rethrow it', async () => {
    const failedDatabase = new PrismaService({
      adapter: new PrismaPg({
        connectionString:
          'postgresql://dss_test:dss_test@127.0.0.1:5434/dss_test',
      }),
    });
    const failure = new Error('synthetic database startup failure');
    jest.spyOn(failedDatabase, '$connect').mockRejectedValueOnce(failure);
    const disconnect = jest
      .spyOn(failedDatabase, '$disconnect')
      .mockResolvedValue(undefined);
    const failed = await assemble(failedDatabase);
    try {
      await expect(failed.init()).rejects.toBe(failure);
      expect(disconnect).toHaveBeenCalledTimes(1);
    } finally {
      try {
        await failed.close();
      } catch (error) {
        expect(error).toBe(failure);
      }
    }
  });
});
