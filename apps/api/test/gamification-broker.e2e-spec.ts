/** Real producer → durable admission → Redis/BullMQ → owner effects. Profiles,
 * definitions and initial level are fixture setup, not authentication evidence.
 */
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import type IORedis from 'ioredis';
import { createEmptyEditorDocument } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import { REDIS_CONNECTION } from '@api/core/cache';
import {
  QUALIFIED_POINTS_CONSUMER,
  type QualifiedPointsConsumer,
} from '@api/modules/community-points';
import {
  QUALIFIED_ACHIEVEMENT_CONSUMER,
  type QualifiedAchievementConsumer,
} from '@api/modules/achievements';
import {
  LEVEL_EVENT_CONSUMER,
  type LevelEventConsumer,
} from '@api/modules/levels';
import { PrismaPointRuleConfigurationReader } from '@api/modules/community-points/infrastructure';
import { PrismaAchievementRuleConfigurationReader } from '@api/modules/achievements/infrastructure';
import { AppModule } from '../src/app.module';
import { GamificationConsumerCompositionModule } from '../src/composition/gamification/gamification-consumer-composition.module';
import { GamificationConsumptionModule } from '../src/composition/gamification-delivery/gamification-consumption.module';
import { GamificationRoutingModule } from '../src/composition/gamification-delivery/gamification-routing.module';
import {
  GAMIFICATION_ADMISSION,
  GAMIFICATION_CONSUMPTION,
} from '../src/composition/gamification-delivery/contracts/consumption.constants';
import type {
  GamificationAdmission,
  GamificationConsumption,
} from '../src/composition/gamification-delivery/contracts/consumption.types';
import {
  GAMIFICATION_ROUTING_CONTROL,
  GAMIFICATION_ROUTING_DISCOVERY,
  GAMIFICATION_ROUTING_PUBLICATION,
} from '../src/composition/gamification-delivery/contracts/routing.constants';
import type {
  RoutingControl,
  RoutingDiscovery,
  RoutingPublication,
} from '../src/composition/gamification-delivery/contracts/routing.types';
import { GamificationCoordinator } from '../src/composition/gamification-delivery/application/gamification-coordinator';
import { GamificationDeliveryPump } from '../src/composition/gamification-delivery/application/delivery-pump';
import {
  GamificationBroker,
  GAMIFICATION_QUEUE_NAME,
} from '../src/composition/gamification-delivery/infrastructure/gamification-broker';
import { verifyAdmissionSeal } from '../src/composition/gamification-delivery/infrastructure/admission-seal.codec';
import { PrismaRuntimeOperations } from '../src/composition/gamification-delivery/infrastructure/prisma-runtime-operations';
import { GamificationRuntimeRunner } from '../src/composition/gamification-delivery/infrastructure/gamification-runner';
import { ActivationPreflightAdapter } from '../src/composition/gamification-delivery/infrastructure/activation-preflight.adapter';
import { PrismaInteractionTargetWriter } from '../src/modules/interactions/infrastructure/repositories/prisma-interaction-target.writer';
import {
  COMMENT_WRITE_TRANSACTION,
  type CommentWriteTransaction,
} from '../src/modules/interactions/contracts/comment-write-transaction.port';
import { LevelsService } from '../src/modules/levels/application/services/levels.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';
import { isDisposableRedisPort } from './helpers/disposable-redis';

describe('Dedicated gamification broker with real owner effects', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let broker: GamificationBroker;
  let pump: GamificationDeliveryPump;
  let runner: GamificationRuntimeRunner;
  let observeWaiting: () => Promise<void>;
  let discovery: RoutingDiscovery;
  let redis: IORedis;
  let comments: CommentWriteTransaction;
  let userId: string;
  let targetId: string;
  let commentId: string;
  let achievementId: string;
  let createdEventId: string;
  const prefix = `producer-test-${randomUUID()}`;
  let waiting:
    | { eventId: string; resolve: () => void; reject: (error: unknown) => void }
    | undefined;

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const module = await Test.createTestingModule({
      imports: [
        AppModule,
        GamificationRoutingModule,
        GamificationConsumptionModule,
        GamificationConsumerCompositionModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    await app.init();
    redis = app.get(REDIS_CONNECTION);
    if (
      !isDisposableRedisPort(redis.options.port) ||
      !['127.0.0.1', 'localhost'].includes(redis.options.host ?? '')
    )
      throw new Error(
        'Real broker proof requires disposable loopback Redis 6380/6381.',
      );
    const coordinator = new GamificationCoordinator(
      app.get<GamificationConsumption>(GAMIFICATION_CONSUMPTION),
      app.get<QualifiedPointsConsumer>(QUALIFIED_POINTS_CONSUMER),
      app.get<LevelEventConsumer>(LEVEL_EVENT_CONSUMER),
      app.get<QualifiedAchievementConsumer>(QUALIFIED_ACHIEVEMENT_CONSUMER),
    );
    broker = new GamificationBroker(redis, coordinator, prefix);
    const operations = new PrismaRuntimeOperations(
      fixture.prisma,
      app.get(AuditWriterService),
      new ActivationPreflightAdapter(
        new ConfigService({ DSS_GAMIFICATION_DEPLOYMENT_CONFIRMED: '1' }),
        new PrismaPointRuleConfigurationReader(),
        new PrismaAchievementRuleConfigurationReader(),
      ),
    );
    discovery = app.get<RoutingDiscovery>(GAMIFICATION_ROUTING_DISCOVERY);
    pump = new GamificationDeliveryPump(
      discovery,
      app.get<RoutingPublication>(GAMIFICATION_ROUTING_PUBLICATION),
      app.get<GamificationAdmission>(GAMIFICATION_ADMISSION),
      app.get<GamificationConsumption>(GAMIFICATION_CONSUMPTION),
      operations,
      broker,
    );
    runner = new GamificationRuntimeRunner(
      new ConfigService({ DSS_GAMIFICATION_ENABLED: '1' }),
      operations,
      broker,
      pump,
    );
    const processOne = coordinator.processOne.bind(
      coordinator,
    ) as GamificationCoordinator['processOne'];
    // Observe committed results without replacing any owner or receipt operation.
    jest.spyOn(coordinator, 'processOne').mockImplementation(async () => {
      try {
        const result = await processOne();
        await observeWaiting();
        return result;
      } catch (error) {
        waiting?.reject(error);
        throw error;
      }
    });
    observeWaiting = async () => {
      const pending = waiting;
      if (pending) {
        const admission = await fixture.prisma.gamificationAdmission.findUnique(
          {
            where: {
              destination_eventId: {
                destination: 'gamification.v1',
                eventId: pending.eventId,
              },
            },
            select: { id: true },
          },
        );
        const receipt =
          admission &&
          (await fixture.prisma.gamificationConsumptionReceipt.findUnique({
            where: { admissionId: admission.id },
          }));
        if (receipt?.state === 'COMPLETE') {
          waiting = undefined;
          pending.resolve();
        } else if (
          receipt?.state === 'BLOCKED' ||
          (receipt?.technicalFailures ?? 0) > 0
        ) {
          waiting = undefined;
          pending.reject(
            new Error('Synthetic delivery failed before completion.'),
          );
        }
      }
    };
    const control = app.get<RoutingControl>(GAMIFICATION_ROUTING_CONTROL);
    const operator = {
      actorId: 'synthetic:broker-proof',
      actorType: 'SERVICE' as const,
    };
    await control.prepare(operator);
    await control.activate(operator, 0n, 'synthetic:private-broker-proof');
    userId = randomUUID();
    targetId = randomUUID();
    achievementId = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id: userId,
        username: userId,
        email: `${userId}@dss.invalid`,
        passwordHash: 'synthetic-not-a-login',
      },
    });
    await app.get(LevelsService).updateDefinition(1, 1, userId);
    await fixture.prisma.achievementDefinition.create({
      data: {
        id: achievementId,
        key: achievementId,
        slug: achievementId,
        name: 'Synthetic comment award',
        color: '#123456',
        badge: 'rocket',
        createdById: userId,
        updatedById: userId,
      },
    });
    await fixture.prisma.achievementRule.create({
      data: {
        achievementId,
        eventName: 'comments.comment.created.v1',
        recipientPayloadKey: 'authorId',
        createdById: userId,
        updatedById: userId,
      },
    });
    const target = new PrismaInteractionTargetWriter(
      app.get(AuditWriterService),
      app.get(OutboxWriterService),
    );
    await fixture.prisma.$transaction((tx) =>
      target.register(tx, {
        id: targetId,
        kind: 'news-article',
        ownerModule: 'news',
        ownerType: 'NewsArticle',
        ownerId: randomUUID(),
        actorId: userId,
      }),
    );
    comments = app.get(COMMENT_WRITE_TRANSACTION);
  }, 60000);
  afterAll(async () => {
    try {
      await runner?.onApplicationShutdown();
      if (waiting && fixture) {
        console.error('Pending synthetic broker phase', {
          deliveries: await fixture.prisma.gamificationDelivery.findMany({
            select: { state: true, cycleAttempts: true },
          }),
          receipts:
            await fixture.prisma.gamificationConsumptionReceipt.findMany({
              select: {
                state: true,
                blockCode: true,
                pointsDone: true,
                achievementsDone: true,
                technicalFailures: true,
              },
            }),
          rejections:
            await fixture.prisma.gamificationAdmissionRejection.findMany({
              select: { code: true },
            }),
        });
      }
      await broker?.close();
      // Delete only this random test namespace, never another worker's queue.
      if (
        redis &&
        prefix.startsWith('producer-test-') &&
        isDisposableRedisPort(redis.options.port)
      ) {
        const cleanup = new Queue(GAMIFICATION_QUEUE_NAME, {
          connection: redis,
          prefix,
        });
        try {
          await cleanup.obliterate();
        } finally {
          await cleanup.close();
        }
      }
    } finally {
      jest.restoreAllMocks();
      try {
        await app?.close();
      } finally {
        await fixture?.close();
      }
    }
  });

  async function delivered(eventId: string) {
    const previous = await fixture.prisma.gamificationAdmission.findUnique({
      where: {
        destination_eventId: { destination: 'gamification.v1', eventId },
      },
    });
    if (previous) {
      const receipt =
        await fixture.prisma.gamificationConsumptionReceipt.findUnique({
          where: { admissionId: previous.id },
        });
      if (receipt?.state === 'COMPLETE') {
        expect(receipt.technicalFailures).toBe(0);
        return previous.id;
      }
    }
    if (waiting)
      throw new Error('Only one observed delivery phase may be pending.');
    // Complete any old finite sweep, then a fresh sweep whose upper bound
    // includes this committed event. The real runner repairs wake hints.
    // One tick alone is not a discovery guarantee for a late-committing row.
    let sweep = await discovery.reconcile();
    while (sweep.status === 'SCANNED' && !sweep.epochClosed)
      sweep = await discovery.reconcile();
    sweep = await discovery.reconcile();
    while (sweep.status === 'SCANNED' && !sweep.epochClosed)
      sweep = await discovery.reconcile();
    const complete = new Promise<void>((resolve, reject) => {
      waiting = { eventId, resolve, reject };
    });
    await pump.tick();
    await observeWaiting();
    await complete;
    const admission =
      await fixture.prisma.gamificationAdmission.findUniqueOrThrow({
        where: {
          destination_eventId: { destination: 'gamification.v1', eventId },
        },
      });
    expect(
      await fixture.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: admission.id },
      }),
    ).toMatchObject({ state: 'COMPLETE', technicalFailures: 0 });
    return admission.id;
  }
  it('repairs a lost initial wake and replays a committed Points facet without a second grant', async () => {
    const row = await comments.create({
      interactionTargetId: targetId,
      authorId: userId,
      parentId: null,
      body: 'Synthetic broker comment',
      documentJson: JSON.stringify(createEmptyEditorDocument('COMMENT')),
      searchText: 'Synthetic broker comment',
      mentionedUsernames: [],
    });
    commentId = row.id;
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: commentId,
        eventName: 'comments.comment.created.v1',
      },
    });
    createdEventId = event.id;
    await discovery.forward();
    const publication = app.get<RoutingPublication>(
      GAMIFICATION_ROUTING_PUBLICATION,
    );
    const claimed = (await publication.claim()).find(
      (claim) => claim.eventId === event.id,
    );
    if (!claimed) throw new Error('Expected actual comment publication claim.');
    const prepared = await app
      .get<GamificationAdmission>(GAMIFICATION_ADMISSION)
      .prepare(claimed);
    if (prepared.status !== 'CREATED')
      throw new Error('Expected a new actual producer admission.');
    const stored = await fixture.prisma.gamificationAdmission.findUniqueOrThrow(
      { where: { id: prepared.admission.admissionId } },
    );
    const seal = verifyAdmissionSeal(
      stored.projection,
      stored.projectionDigest,
      stored.encodedBytes,
    );
    if (!('POINTS' in seal.inputs)) throw new Error('Expected Points facet.');
    // Exact crash prefix: owner committed, root flag and initial queue add absent.
    // No process-kill or elapsed recovery lease is claimed by this fixture.
    await app
      .get<QualifiedPointsConsumer>(QUALIFIED_POINTS_CONSUMER)
      .advance(seal.inputs.POINTS.command);
    expect(
      await fixture.prisma.gamificationConsumptionReceipt.findUniqueOrThrow({
        where: { admissionId: stored.id },
      }),
    ).toMatchObject({ pointsDone: false, state: 'READY' });
    await runner.start();
    await delivered(event.id);
    expect(await publication.acknowledge(claimed)).toBe(true);
    expect(
      await fixture.prisma.communityPointEntry.count({
        where: { userId, sourceEventId: event.id },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.achievementAward.count({
        where: { userId, achievementId, sourceEventId: event.id },
      }),
    ).toBe(1);
  });
  it('consumes the durable ledger second hop into the authoritative level', async () => {
    const entry = await fixture.prisma.communityPointEntry.findUniqueOrThrow({
      where: { sourceEventId: createdEventId },
    });
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: entry.id,
        eventName: 'community-points.awarded.v1',
      },
    });
    await delivered(event.id);
    expect(await app.get(LevelsService).progress(userId)).toMatchObject({
      balance: 1,
      currentLevel: 1,
    });
  });
  it('continues source retirement without spending technical retries or restoring old grants', async () => {
    await comments.tombstone(commentId, userId, 'Synthetic broker withdrawal');
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: commentId,
        eventName: 'comments.comment.tombstoned.v1',
      },
    });
    const admissionId = await delivered(event.id);
    const attempts =
      await fixture.prisma.gamificationConsumptionAttempt.findMany({
        where: { admissionId },
        orderBy: { claimSequence: 'asc' },
        select: { state: true },
      });
    expect(attempts.map((attempt) => attempt.state)).toEqual([
      'CONTINUED',
      'COMPLETE',
    ]);
    expect(
      await fixture.prisma.achievementAwardRevocation.count({
        where: { award: { userId, achievementId } },
      }),
    ).toBe(1);
    expect(
      (
        await fixture.prisma.communityPointEntry.aggregate({
          where: { userId },
          _sum: { points: true },
        })
      )._sum.points,
    ).toBe(0);
  });
  it('delivers the durable ledger reversal and leaves exactly one original contribution', async () => {
    const original = await fixture.prisma.communityPointEntry.findUniqueOrThrow(
      { where: { sourceEventId: createdEventId } },
    );
    const reversal = await fixture.prisma.communityPointEntry.findUniqueOrThrow(
      { where: { reversesEntryId: original.id } },
    );
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: reversal.id,
        eventName: 'community-points.reversed.v1',
      },
    });
    await delivered(event.id);
    expect(await app.get(LevelsService).progress(userId)).toMatchObject({
      balance: 0,
      currentLevel: 0,
    });
    expect(
      await fixture.prisma.communityPointEntry.count({ where: { userId } }),
    ).toBe(2);
  });
});
