/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Routing Verification
 * 📄 File: apps/api/src/composition/gamification-delivery/gamification-routing.module.spec.ts
 * 🎯 Purpose: Verifies the real minimal Nest assembly and its immutable capability boundary.
 * 🧠 Responsibilities: Excludes automatic startup and preserves delegated error identity.
 * 🏗️ Architecture: Unit composition test with database IO replaced.
 * ⚠️ Important: Database protocol correctness is covered by migrated integration tests.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModulesContainer } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService, PRISMA_CLIENT_OPTIONS } from '@api/core/database';
import { GamificationRoutingModule } from './gamification-routing.module';
import {
  GAMIFICATION_ROUTING_CONTROL,
  GAMIFICATION_ROUTING_DISCOVERY,
  GAMIFICATION_ROUTING_PUBLICATION,
} from './contracts/routing.constants';
import type {
  RoutingControl,
  RoutingDiscovery,
  RoutingPublication,
} from './contracts/routing.types';
import { PrismaRoutingControlRepository } from './infrastructure/prisma-routing-control.repository';
import { PrismaRoutingDiscoveryRepository } from './infrastructure/prisma-routing-discovery.repository';
import { PrismaRoutingPublicationRepository } from './infrastructure/prisma-routing-publication.repository';
import {
  assertBatch,
  assertClaim,
  assertIdentity,
  assertOperator,
  assertRevision,
} from './contracts/routing-validation';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: new ConfigService({ NODE_ENV: 'test' }),
    },
  ],
  exports: [ConfigService],
})
class RoutingTestConfigurationModule {}
describe('Minimal routing composition', () => {
  let context: TestingModule;
  const query = jest.fn();
  beforeEach(async () => {
    query.mockReset();
    context = await Test.createTestingModule({
      imports: [RoutingTestConfigurationModule, GamificationRoutingModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: query, $executeRaw: query, $transaction: query })
      .overrideProvider(PRISMA_CLIENT_OPTIONS)
      .useValue({})
      .compile();
    await context.init();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await context?.close();
  });
  it('starts no database work, destination preparation, queue, presentation or scoring owner', () => {
    expect(query).not.toHaveBeenCalled();
    const modules = [...context.get(ModulesContainer).values()].map(
      ({ metatype }) => metatype.name,
    );
    for (const name of [
      'AppModule',
      'QueueModule',
      'UsersModule',
      'AuthModule',
      'GraphQLModule',
      'ScheduleModule',
      'CommunityPointsRuntimeModule',
      'LevelsRuntimeModule',
      'AchievementsRuntimeModule',
    ])
      expect(modules).not.toContain(name);
    const capabilities = [
      [
        context.get<RoutingControl>(GAMIFICATION_ROUTING_CONTROL),
        ['activate', 'prepare', 'setPaused'],
      ],
      [
        context.get<RoutingDiscovery>(GAMIFICATION_ROUTING_DISCOVERY),
        ['forward', 'reconcile'],
      ],
      [
        context.get<RoutingPublication>(GAMIFICATION_ROUTING_PUBLICATION),
        ['acknowledge', 'claim', 'fail', 'recover'],
      ],
    ] as const;
    for (const [capability, keys] of capabilities) {
      expect(Object.isFrozen(capability)).toBe(true);
      expect(Object.keys(capability).sort()).toEqual(keys);
    }
  });
  it('forwards control, discovery and publication commands without exposing repositories or changing errors', async () => {
    const operator = {
      actorId: 'synthetic:operator',
      actorType: 'SERVICE',
    } as const;
    const prepared = { state: 'PREPARED', cutoff: null, revision: 0n } as const;
    const control = context.get<RoutingControl>(GAMIFICATION_ROUTING_CONTROL);
    const controlRepo = context.get(PrismaRoutingControlRepository);
    const prepare = jest
      .spyOn(controlRepo, 'prepare')
      .mockResolvedValue(prepared);
    await expect(control.prepare(operator)).resolves.toBe(prepared);
    expect(prepare).toHaveBeenCalledWith(operator);
    const scan = {
      status: 'SCANNED',
      examined: 0,
      inserted: 0,
      epochClosed: false,
    } as const;
    const discovery = context.get<RoutingDiscovery>(
      GAMIFICATION_ROUTING_DISCOVERY,
    );
    const forward = jest
      .spyOn(context.get(PrismaRoutingDiscoveryRepository), 'forward')
      .mockResolvedValue(scan);
    await expect(discovery.forward(2)).resolves.toBe(scan);
    expect(forward).toHaveBeenCalledWith(2);
    const failure = new Error('synthetic destination unavailable');
    const recover = jest
      .spyOn(context.get(PrismaRoutingPublicationRepository), 'recover')
      .mockRejectedValue(failure);
    await expect(
      context
        .get<RoutingPublication>(GAMIFICATION_ROUTING_PUBLICATION)
        .recover(1),
    ).rejects.toBe(failure);
    expect(recover).toHaveBeenCalledWith(1);
  });
});
describe('Routing command validation', () => {
  it('accepts inclusive bounds and rejects invalid numeric/identity commands without IO', () => {
    expect(() => assertBatch(1, 32)).not.toThrow();
    expect(() => assertBatch(32, 32)).not.toThrow();
    for (const value of [0, -1, 33, NaN, Infinity, 1.5])
      expect(() => assertBatch(value, 32)).toThrow(TypeError);
    for (const value of ['', ' ', ' padded', 'x'.repeat(201)])
      expect(() => assertIdentity(value)).toThrow(TypeError);
    expect(() => assertIdentity('synthetic:valid')).not.toThrow();
    expect(() =>
      assertOperator({ actorId: 'x', actorType: 'SERVICE' }),
    ).not.toThrow();
    expect(() => assertOperator({ actorId: '', actorType: 'SERVICE' })).toThrow(
      TypeError,
    );
    expect(() => assertOperator(null as never)).toThrow(TypeError);
    expect(() => assertRevision(0n)).not.toThrow();
    expect(() => assertRevision(-1n)).toThrow(TypeError);
    expect(() => assertRevision(9223372036854775808n)).toThrow(TypeError);
    expect(() => assertRevision(1 as never)).toThrow(TypeError);
    const valid = {
      eventId: '00000000-0000-0000-0000-000000000000',
      claimToken: '00000000-0000-0000-0000-000000000001',
      cycle: 0,
      cycleAttempt: 1,
    };
    expect(() => assertClaim(valid)).not.toThrow();
    for (const invalid of [
      { ...valid, eventId: 'bad' },
      { ...valid, cycle: -1 },
      { ...valid, cycle: 2147483648 },
      { ...valid, cycleAttempt: 0 },
      { ...valid, cycleAttempt: 6 },
    ])
      expect(() => assertClaim(invalid)).toThrow(TypeError);
  });
});
