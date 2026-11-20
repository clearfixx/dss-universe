/** Trusted OS operator entrypoint. No HTTP listener and no implicit activation. */
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

async function main(): Promise<void> {
  const [command = 'run', ...args] = process.argv.slice(2);
  if (
    ![
      'run',
      'status',
      'preflight',
      'prepare',
      'activate',
      'pause',
      'resume',
      'retry-publication',
      'retry-consumption',
    ].includes(command)
  )
    throw new Error('UNKNOWN_OPERATION');
  if (command === 'run' && process.env.DSS_GAMIFICATION_ENABLED !== '1') {
    console.log('Gamification runtime is disabled.');
    return;
  }
  let app: INestApplicationContext | undefined;
  let keepAlive = false;
  try {
    const { GamificationOperationsModule } =
      await import('./composition/gamification-delivery/gamification-operations.module.js');
    const module =
      command === 'run'
        ? (
            await import('./composition/gamification-delivery/gamification-runtime.module.js')
          ).GamificationRuntimeModule
        : GamificationOperationsModule;
    app = await NestFactory.createApplicationContext(module, {
      logger: false,
      abortOnError: false,
    });
    if (command === 'run') {
      const { GamificationRuntimeRunner } =
        await import('./composition/gamification-delivery/infrastructure/gamification-runner.js');
      const runner = app.get(GamificationRuntimeRunner);
      await runner.start();
      const context = app;
      let stopping = false;
      const shutdown = () => {
        if (stopping) return;
        stopping = true;
        // Stop and drain owner work before Nest disconnects Prisma/Redis.
        void runner
          .onApplicationShutdown()
          .finally(() => context.close())
          .catch(() => {
            console.error('Gamification shutdown failed.');
            process.exitCode = 1;
          });
      };
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
      keepAlive = true;
      return;
    }
    app.enableShutdownHooks();
    const { PrismaRuntimeOperations } =
      await import('./composition/gamification-delivery/infrastructure/prisma-runtime-operations.js');
    const { GAMIFICATION_ROUTING_CONTROL } =
      await import('./composition/gamification-delivery/contracts/routing.constants.js');
    const { REDIS_CONNECTION } = await import('./core/cache/index.js');
    const operations = app.get(PrismaRuntimeOperations);
    const control = app.get<
      import('./composition/gamification-delivery/contracts/routing.types').RoutingControl
    >(GAMIFICATION_ROUTING_CONTROL);
    const operator = {
      actorId: 'trusted-os-operator',
      actorType: 'SERVICE' as const,
    };
    const revision = (value: string | undefined): bigint => {
      if (
        !value ||
        !/^(0|[1-9][0-9]{0,18})$/.test(value) ||
        BigInt(value) > 9223372036854775807n
      )
        throw new Error('EXPLICIT_REVISION_REQUIRED');
      return BigInt(value);
    };
    if (command === 'status')
      console.log(
        JSON.stringify(await operations.state(), (_, value: unknown) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      );
    else if (command === 'preflight') {
      const redis = app.get<import('ioredis').default>(REDIS_CONNECTION);
      await redis.ping();
      await operations.preflight();
      console.log('READY');
    } else if (command === 'prepare') await control.prepare(operator);
    else if (command === 'activate') {
      const redis = app.get<import('ioredis').default>(REDIS_CONNECTION);
      await redis.ping();
      await control.activate(
        operator,
        revision(args[0]),
        `trusted-preflight:${randomUUID()}`,
      );
    } else if (command === 'pause' || command === 'resume')
      await control.setPaused(command === 'pause', operator, revision(args[0]));
    else if (command === 'retry-publication')
      await operations.retryPublication(
        args[0],
        revision(args[1]),
        args[2],
        operator,
      );
    else
      await operations.retryConsumption(
        args[0],
        revision(args[1]),
        args[2],
        operator,
      );
  } finally {
    if (!keepAlive) await app?.close();
  }
}
void main().catch(() => {
  // Neither credentials, raw SQL nor source/recipient data belongs in CLI output.
  console.error(
    'Gamification operation failed. Check deployment readiness and explicit revisions.',
  );
  // Failed Nest initialization can retain driver handles before a context is
  // returned. Cleanup is attempted above; do not leave a failed CLI alive.
  process.exit(1);
});
