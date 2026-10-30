/**
 * DSS File Passport — DEBT-007 diagnostic artifact.
 * Purpose: tests constructor/lifecycle feasibility using current source providers.
 * Not a production assembly, queue consumer, migration or delivery proof.
 */
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '../..');
const api = createRequire(resolve(root, 'apps/api/package.json'));
api('ts-node').register({
  project: resolve(root, 'apps/api/tsconfig.json'),
  transpileOnly: true,
});
api('tsconfig-paths').register({
  baseUrl: root,
  paths: { '@api/*': ['apps/api/src/*'] },
});
api('reflect-metadata');
const { Module, Global } = api('@nestjs/common');
const { MODULE_METADATA } = api('@nestjs/common/constants');
const { ConfigModule } = api('@nestjs/config');
const { NestFactory, ModulesContainer } = api('@nestjs/core');
const source = (path) => api(resolve(root, 'apps/api/src', path));
const { PrismaModule, PrismaService } = source('core/database');
const points = source('modules/community-points');
const levels = source('modules/levels');
const achievements = source('modules/achievements');
const { PROFILE_EXISTENCE_READER } = source('modules/users');
const { PrismaTransactionalProfileExistenceReader } = source('modules/users/infrastructure');
const { PrismaManualAwardWriter } = source('modules/achievements/infrastructure');
const { PrismaManualAwardTransaction } = source('composition/gamification/infrastructure/prisma-manual-award.transaction');
const { RecipientExistenceAdapter } = source('composition/gamification/infrastructure/recipient-existence.adapter');
const { LevelPointsBalanceAdapter } = source('composition/gamification/infrastructure/level-points-balance.adapter');

function candidate(original) {
  const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, original);
  const resolvers = providers.filter((provider) => typeof provider === 'function' && provider.name.endsWith('Resolver'));
  assert.equal(resolvers.length, 1);
  class CandidateOwner {}
  Module({
    imports: Reflect.getMetadata(MODULE_METADATA.IMPORTS, original),
    providers: providers.filter((provider) => !resolvers.includes(provider)),
    exports: Reflect.getMetadata(MODULE_METADATA.EXPORTS, original),
  })(CandidateOwner);
  return CandidateOwner;
}

async function main() {
  const database = new URL(process.env.DATABASE_URL);
  assert.equal(database.hostname, '127.0.0.1');
  assert.equal(database.port, '5434');
  assert.equal(database.pathname, '/dss_test');
  assert.equal(database.username, 'dss_test');
  const recipientTokens = [points.POINTS_RECIPIENT_EXISTENCE, levels.LEVEL_RECIPIENT_EXISTENCE, achievements.ACHIEVEMENT_RECIPIENT_EXISTENCE];
  class CandidateBindings {}
  Global()(CandidateBindings);
  Module({
    imports: [PrismaModule, candidate(points.CommunityPointsModule), candidate(levels.LevelsModule), candidate(achievements.AchievementsModule)],
    providers: [
      PrismaTransactionalProfileExistenceReader, PrismaManualAwardWriter,
      { provide: achievements.MANUAL_AWARD_TRANSACTION, useClass: PrismaManualAwardTransaction },
      { provide: PROFILE_EXISTENCE_READER, inject: [PrismaService, PrismaTransactionalProfileExistenceReader], useFactory: (prisma, reader) => ({ exists: (id) => reader.exists(prisma, id) }) },
      ...recipientTokens.map((provide) => ({ provide, useClass: RecipientExistenceAdapter })),
      { provide: levels.LEVEL_POINTS_BALANCE_READER, useClass: LevelPointsBalanceAdapter },
    ],
    exports: [...recipientTokens, levels.LEVEL_POINTS_BALANCE_READER, achievements.MANUAL_AWARD_TRANSACTION],
  })(CandidateBindings);
  class ProbeRoot {}
  Module({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), CandidateBindings] })(ProbeRoot);
  let context;
  try {
    context = await NestFactory.createApplicationContext(ProbeRoot, { logger: false, abortOnError: false });
    const modules = [...context.get(ModulesContainer).values()];
    const moduleNames = modules.map((entry) => entry.metatype.name);
    const forbidden = moduleNames.filter((name) => /^(AppModule|QueueModule|UsersModule|CustomTitlesModule|GraphQLModule|ScheduleModule)$/.test(name));
    assert.deepEqual(forbidden, []);
    const providers = modules.flatMap((entry) => [...entry.providers.values()]).map((entry) => entry.metatype?.name).filter(Boolean);
    assert.deepEqual(providers.filter((name) => /Resolver$|OutboxDispatcher|QueueRegistry|Processor$/.test(name)), []);
    for (const name of ['CommunityPointsService', 'LevelsService', 'AchievementsService', 'PrismaManualAwardTransaction']) assert(providers.includes(name), name);
    const health = await context.get(PrismaService).healthCheck();
    assert.equal(health.status, 'up');
    console.log(JSON.stringify({ status: 'constructor-and-lifecycle-probe-passed', moduleNames, providerCount: providers.length, databaseHealth: health.status, effectsInvoked: false, queueConnected: false }));
  } finally {
    if (context) { await context.close(); console.log('context-closed'); }
  }
}
main().catch((error) => { console.error(error.name, error.message); process.exitCode = 1; });
