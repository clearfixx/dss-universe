/** Real headless operational assembly and activation/configuration serialization. */
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import {
  PrismaPointRuleConfigurationReader,
  PointRuleDeliveryConfigurationError,
} from '@api/modules/community-points/infrastructure';
import { GamificationRuntimeModule } from '../src/composition/gamification-delivery/gamification-runtime.module';
import { GAMIFICATION_ROUTING_CONTROL } from '../src/composition/gamification-delivery/contracts/routing.constants';
import type { RoutingControl } from '../src/composition/gamification-delivery/contracts/routing.types';
import { PrismaRuntimeOperations } from '../src/composition/gamification-delivery/infrastructure/prisma-runtime-operations';
import { PointRuleConfigurationAdapter } from '../src/composition/gamification-delivery/gamification-configuration.module';
import { PrismaCommunityPointsRepository } from '../src/modules/community-points/infrastructure/repositories/prisma-community-points.repository';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';
import { disposableRedisPort } from './helpers/disposable-redis';

describe('Headless operational activation', () => {
  let f: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let module: TestingModule;
  let pool: Pool;
  beforeAll(async () => {
    f = await createIsolatedApiSchemaFixture();
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${f.schema},public`,
    });
    module = await Test.createTestingModule({
      imports: [GamificationRuntimeModule],
    })
      .overrideProvider(PrismaService)
      .useValue(f.prisma)
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          REDIS_HOST: '127.0.0.1',
          REDIS_PORT: disposableRedisPort(),
          DSS_GAMIFICATION_DEPLOYMENT_CONFIRMED: '1',
        }),
      )
      .compile();
    await module.init();
  }, 60000);
  afterAll(async () => {
    jest.restoreAllMocks();
    try {
      await module?.close();
    } finally {
      try {
        await pool?.end();
      } finally {
        await f?.close();
      }
    }
  });
  it('rejects existing unsupported configuration and serializes a new writer through the actual activation preflight', async () => {
    const control = module.get<RoutingControl>(GAMIFICATION_ROUTING_CONTROL);
    const operations = module.get(PrismaRuntimeOperations);
    const operator = {
      actorId: 'synthetic:activation',
      actorType: 'SERVICE' as const,
    };
    await control.prepare(operator);
    const key = 'synthetic-unrepresented';
    await f.prisma.communityPointRule.create({
      data: { key, eventName: 'synthetic.unknown.v1', points: 1 },
    });
    await expect(
      control.activate(operator, 0n, 'synthetic:readiness'),
    ).rejects.toThrow('UNREPRESENTED_POINT_CONFIGURATION');
    expect(await operations.state()).toMatchObject({
      state: 'PREPARED',
      revision: 0n,
      cutoff: null,
    });
    expect(
      await f.prisma.auditRecord.count({
        where: { action: 'gamification.activation.activated' },
      }),
    ).toBe(0);
    await f.prisma.communityPointRule.update({
      where: { key },
      data: { enabled: false },
    });

    const reader = module.get<PrismaPointRuleConfigurationReader>(
      PrismaPointRuleConfigurationReader,
    );
    const read = reader.read;
    let entered!: (pid: number) => void;
    let release!: () => void;
    const ready = new Promise<number>((resolve) => {
      entered = resolve;
    });
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    jest.spyOn(reader, 'read').mockImplementationOnce(async (tx) => {
      const rows = await read(tx);
      const [backend] = await tx.$queryRaw<
        { pid: number }[]
      >`SELECT pg_backend_pid() AS pid`;
      entered(backend.pid);
      await held;
      return rows;
    });
    const activation = control.activate(operator, 0n, 'synthetic:readiness');
    void activation.catch(() => undefined);
    const pid = await ready;
    const repository = new PrismaCommunityPointsRepository(
      f.prisma,
      module.get(AuditWriterService),
      new OutboxWriterService(),
      new PointRuleConfigurationAdapter(),
    );
    const writer = repository.updateRule(
      key,
      1,
      null,
      true,
      'synthetic:operator',
    );
    void writer.catch(() => undefined);
    try {
      const deadline = performance.now() + 2000;
      let blocked = false;
      do {
        blocked = (
          await pool.query<{ blocked: boolean }>(
            'SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))) AS blocked',
            [pid],
          )
        ).rows[0].blocked;
        if (!blocked && performance.now() >= deadline)
          throw new Error(
            'Real configuration writer did not wait for activation.',
          );
      } while (!blocked);
    } finally {
      release();
      await Promise.allSettled([activation, writer]);
    }
    const active = await activation;
    await expect(writer).rejects.toBeInstanceOf(
      PointRuleDeliveryConfigurationError,
    );
    expect(active).toMatchObject({ state: 'ACTIVE', revision: 1n });
    expect(active.cutoff).toBeInstanceOf(Date);
    expect(
      await f.prisma.communityPointRule.findUniqueOrThrow({ where: { key } }),
    ).toMatchObject({ enabled: false });
    await expect(
      control.activate(operator, 1n, 'synthetic:second-activation'),
    ).rejects.toThrow('ALREADY_ACTIVATED');
    expect((await operations.state())?.cutoff).toEqual(active.cutoff);
  });
});
