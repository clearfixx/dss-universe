/** Real producer/root/owner proof in a migrated private schema. Direct fixture
 * profiles and persistence calls are not authentication or permission evidence.
 * Queue delivery and deployment activation are deliberately not claimed here.
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { createEmptyEditorDocument } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import {
  QUALIFIED_POINTS_CONSUMER,
  type QualifiedPointsConsumer,
} from '@api/modules/community-points';
import {
  POINT_RULE_DELIVERY_GUARD,
  type PointRuleDeliveryGuard,
} from '@api/modules/community-points/infrastructure';
import {
  QUALIFIED_ACHIEVEMENT_CONSUMER,
  type QualifiedAchievementConsumer,
} from '@api/modules/achievements';
import {
  LEVEL_EVENT_CONSUMER,
  type LevelEventConsumer,
} from '@api/modules/levels';
import { AppModule } from '../src/app.module';
import { GamificationConsumptionModule } from '../src/composition/gamification-delivery/gamification-consumption.module';
import { GamificationRoutingModule } from '../src/composition/gamification-delivery/gamification-routing.module';
import { GamificationConsumerCompositionModule } from '../src/composition/gamification/gamification-consumer-composition.module';
import { GAMIFICATION_ADMISSION } from '../src/composition/gamification-delivery/contracts/consumption.constants';
import {
  GAMIFICATION_ROUTING_CONTROL,
  GAMIFICATION_ROUTING_DISCOVERY,
  GAMIFICATION_ROUTING_PUBLICATION,
} from '../src/composition/gamification-delivery/contracts/routing.constants';
import type { GamificationAdmission } from '../src/composition/gamification-delivery/contracts/consumption.types';
import type {
  PublicationClaim,
  RoutingControl,
  RoutingDiscovery,
  RoutingPublication,
} from '../src/composition/gamification-delivery/contracts/routing.types';
import {
  encodeAdmissionSeal,
  verifyAdmissionSeal,
} from '../src/composition/gamification-delivery/infrastructure/admission-seal.codec';
import { AdmissionCodecError } from '../src/composition/gamification-delivery/infrastructure/admission-codec.error';
import { PrismaNewsWorkflowRepository } from '../src/modules/news/infrastructure/repositories/prisma-news-workflow.repository';
import { PrismaInteractionTargetWriter } from '../src/modules/interactions/infrastructure/repositories/prisma-interaction-target.writer';
import {
  COMMENT_WRITE_TRANSACTION,
  type CommentWriteTransaction,
} from '../src/modules/interactions/contracts/comment-write-transaction.port';
import { LevelsService } from '../src/modules/levels/application/services/levels.service';
import { CommunityPointsService } from '../src/modules/community-points/application/services/community-points.service';
import { AchievementsService } from '../src/modules/achievements/application/services/achievements.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Registered gamification producer coverage', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let pool: Pool;
  let admission: GamificationAdmission;
  let discovery: RoutingDiscovery;
  let publication: RoutingPublication;
  let control: RoutingControl;
  let comments: CommentWriteTransaction;
  const claims = new Map<string, PublicationClaim>();
  const operator = {
    actorId: 'synthetic:producer-coverage',
    actorType: 'SERVICE' as const,
  };
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
    const module = await Test.createTestingModule({
      imports: [
        AppModule,
        GamificationConsumptionModule,
        GamificationRoutingModule,
        GamificationConsumerCompositionModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    await app.init();
    admission = app.get(GAMIFICATION_ADMISSION);
    discovery = app.get(GAMIFICATION_ROUTING_DISCOVERY);
    publication = app.get(GAMIFICATION_ROUTING_PUBLICATION);
    control = app.get(GAMIFICATION_ROUTING_CONTROL);
    comments = app.get(COMMENT_WRITE_TRANSACTION);
    await control.prepare(operator);
    await control.activate(operator, 0n, 'synthetic:isolated-producer-proof');
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      try {
        await pool?.end();
      } finally {
        await fixture?.close();
      }
    }
  });

  async function subject() {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        username: id,
        email: `${id}@dss.invalid`,
        passwordHash: 'synthetic-not-a-login',
      },
    });
    return id;
  }
  async function target(actorId: string, ownerId = randomUUID()) {
    const id = randomUUID();
    const writer = new PrismaInteractionTargetWriter(
      app.get(AuditWriterService),
      app.get(OutboxWriterService),
    );
    await fixture.prisma.$transaction((tx) =>
      writer.register(tx, {
        id,
        kind: 'news-article',
        ownerModule: 'news',
        ownerType: 'NewsArticle',
        ownerId,
        actorId,
      }),
    );
    return { id, ownerId };
  }
  async function published(authorId: string, actorId = authorId) {
    const linked = await target(actorId);
    await fixture.prisma.newsArticle.create({
      data: {
        id: linked.ownerId,
        interactionTargetId: linked.id,
        authorId,
        slug: randomUUID(),
        title: 'Synthetic secret title',
        shortText: 'Synthetic private summary',
        plainText: 'Private source text',
        searchText: 'Private source text',
        document: JSON.parse(
          JSON.stringify(createEmptyEditorDocument('NEWS')),
        ) as object,
        status: 'APPROVED',
        approvedVersion: 1,
      },
    });
    const writer = new PrismaNewsWorkflowRepository(
      fixture.prisma,
      app.get(AuditWriterService),
      app.get(OutboxWriterService),
    );
    expect(
      await writer.transition({
        articleId: linked.ownerId,
        actorId,
        expectedStatus: 'APPROVED',
        expectedVersion: 1,
        nextStatus: 'PUBLISHED',
        action: 'PUBLISHED',
        reason: 'Synthetic secret editorial reason',
      }),
    ).not.toBeNull();
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: linked.ownerId,
        producer: 'dss.api.news',
        eventName: 'news.article.published.v1',
      },
    });
    return { eventId: event.id, articleId: linked.ownerId };
  }
  async function comment(authorId: string) {
    const linked = await target(authorId);
    const document = createEmptyEditorDocument('COMMENT');
    const row = await comments.create({
      interactionTargetId: linked.id,
      authorId,
      parentId: null,
      body: 'Synthetic secret comment',
      documentJson: JSON.stringify(document),
      searchText: 'Synthetic secret comment',
      mentionedUsernames: [],
    });
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: row.id,
        producer: 'dss.api.comments',
        eventName: 'comments.comment.created.v1',
      },
    });
    return { row, eventId: event.id };
  }
  async function sourceEvent(sourceId: string, name: string) {
    return fixture.prisma.outboxEvent.findFirstOrThrow({
      where: { aggregateId: sourceId, eventName: name },
    });
  }
  async function drainDiscovery() {
    for (;;) {
      const result = await discovery.forward();
      if (result.examined === 0) break;
    }
  }
  async function claimed(eventId: string) {
    await drainDiscovery();
    while (!claims.has(eventId)) {
      const batch = await publication.claim();
      if (!batch.length) throw new Error('Expected registered source claim.');
      for (const claim of batch) claims.set(claim.eventId, claim);
    }
    return claims.get(eventId)!;
  }
  async function seal(eventId: string) {
    const prepared = await admission.prepare(await claimed(eventId));
    if (prepared.status !== 'CREATED' && prepared.status !== 'REUSED')
      throw new Error(
        `Unexpected admission: ${prepared.status}${'code' in prepared ? ':' + prepared.code : ''}`,
      );
    const row = await fixture.prisma.gamificationAdmission.findUniqueOrThrow({
      where: { id: prepared.admission.admissionId },
    });
    return verifyAdmissionSeal(
      row.projection,
      row.projectionDigest,
      row.encodedBytes,
    );
  }
  async function pointCommand(eventId: string) {
    const projection = await seal(eventId);
    if (!('POINTS' in projection.inputs))
      throw new Error('Expected Points source.');
    return { projection, command: projection.inputs.POINTS.command };
  }
  async function balance(userId: string) {
    return (
      (
        await fixture.prisma.communityPointEntry.aggregate({
          where: { userId },
          _sum: { points: true },
        })
      )._sum.points ?? 0
    );
  }
  async function badge(
    eventName: string,
    actorId: string,
    recipientPayloadKey = 'authorId',
  ) {
    const key = randomUUID();
    const definition = await fixture.prisma.achievementDefinition.create({
      data: {
        key,
        name: key,
        slug: key,
        color: '#123456',
        badge: 'rocket',
        createdById: actorId,
        updatedById: actorId,
      },
    });
    const achievements = app.get(AchievementsService);
    await achievements.writeRule(
      {
        achievementId: definition.id,
        eventName,
        recipientPayloadKey,
        repeatable: false,
        cooldownHours: 0,
        dailyCap: null,
        enabled: true,
      },
      actorId,
    );
    return definition.id;
  }

  it('seals a real News publication without content and credits its author rather than publisher', async () => {
    const author = await subject(),
      publisher = await subject();
    const article = await published(author, publisher);
    const prepared = await pointCommand(article.eventId);
    expect(prepared.projection.descriptor.id).toBe('news.publication');
    expect(JSON.stringify(prepared.projection)).not.toMatch(
      /Synthetic secret|Private source text/,
    );
    expect(prepared.command).toMatchObject({
      recipientId: author,
      event: { actorId: publisher, eventName: 'news.article.published.v1' },
    });
    for (const command of [
      { ...prepared.command, recipientId: publisher },
      {
        ...prepared.command,
        contribution: {
          ...prepared.command.contribution,
          producer: 'dss.api.reputation',
        },
      },
      {
        ...prepared.command,
        event: { ...prepared.command.event, sourceId: randomUUID() },
      },
    ]) {
      expect(() =>
        encodeAdmissionSeal({
          ...prepared.projection,
          inputs: {
            ...prepared.projection.inputs,
            POINTS: { codec: 'points.qualified.v1', command },
          },
        }),
      ).toThrow(AdmissionCodecError);
    }
    const points = app.get<QualifiedPointsConsumer>(QUALIFIED_POINTS_CONSUMER);
    expect((await points.advance(prepared.command)).status).toBe('COMPLETE');
    expect(await balance(author)).toBe(10);
    expect(await balance(publisher)).toBe(0);
    expect(
      (await admission.prepare(await claimed(article.eventId))).status,
    ).toBe('REUSED');
    expect(await points.advance(prepared.command)).toMatchObject({
      status: 'COMPLETE',
      facets: [{ replayed: true }],
    });
    expect(await balance(author)).toBe(10);
  });

  it('qualifies and withdraws an actual comment through both real owners', async () => {
    const author = await subject();
    const definition = await badge('comments.comment.created.v1', author);
    const source = await comment(author);
    const created = await pointCommand(source.eventId);
    const points = app.get<QualifiedPointsConsumer>(QUALIFIED_POINTS_CONSUMER);
    const achievements = app.get<QualifiedAchievementConsumer>(
      QUALIFIED_ACHIEVEMENT_CONSUMER,
    );
    expect((await points.advance(created.command)).status).toBe('COMPLETE');
    expect(
      (
        await achievements.advance(
          created.projection.inputs.ACHIEVEMENTS.command,
        )
      ).status,
    ).toBe('COMPLETE');
    expect(await balance(author)).toBe(1);
    const award = await fixture.prisma.achievementAward.findFirstOrThrow({
      where: { userId: author, achievementId: definition },
    });
    await comments.tombstone(
      source.row.id,
      author,
      'Synthetic secret moderation reason',
    );
    const event = await sourceEvent(
      source.row.id,
      'comments.comment.tombstoned.v1',
    );
    const withdrawn = await pointCommand(event.id);
    expect(JSON.stringify(withdrawn.projection)).not.toMatch(
      /Synthetic secret/,
    );
    expect(withdrawn.command.facts).toHaveLength(3);
    expect(new Set(withdrawn.command.facts.map((f) => f.factId)).size).toBe(3);
    expect(await points.advance(withdrawn.command)).toMatchObject({
      status: 'COMPLETE',
      facets: [
        { facet: 'CONTROL', disposition: 'APPLIED' },
        { facet: 'CONTRIBUTION', disposition: 'NO_MATCH' },
      ],
    });
    const withdrawalCommand = withdrawn.projection.inputs.ACHIEVEMENTS.command;
    // Enrollment was completed by creation; retirement persists one bounded page.
    expect(await achievements.advance(withdrawalCommand)).toMatchObject({
      status: 'CONTINUE',
      examined: 1,
    });
    expect(await achievements.advance(withdrawalCommand)).toMatchObject({
      status: 'COMPLETE',
      examined: 0,
    });
    expect(await balance(author)).toBe(0);
    expect(
      await fixture.prisma.achievementAwardRevocation.count({
        where: { awardId: award.id },
      }),
    ).toBe(1);
    expect(await points.advance(created.command)).toMatchObject({
      status: 'COMPLETE',
      facets: [{ replayed: true }],
    });
    expect(await balance(author)).toBe(0);
  });

  it('does not credit a delayed comment creation after its native withdrawal', async () => {
    const author = await subject();
    const source = await comment(author);
    const delayed = await pointCommand(source.eventId);
    await comments.tombstone(
      source.row.id,
      author,
      'Synthetic earlier withdrawal',
    );
    const event = await sourceEvent(
      source.row.id,
      'comments.comment.tombstoned.v1',
    );
    const withdrawn = await pointCommand(event.id);
    const points = app.get<QualifiedPointsConsumer>(QUALIFIED_POINTS_CONSUMER);
    expect((await points.advance(withdrawn.command)).status).toBe('COMPLETE');
    expect(await points.advance(delayed.command)).toMatchObject({
      status: 'COMPLETE',
      facets: [{ disposition: 'SOURCE_REVOKED' }],
    });
    expect(await balance(author)).toBe(0);
  });

  it('prepares a fresh late creation seal with the existing withdrawal evidence', async () => {
    const author = await subject(),
      source = await comment(author);
    await comments.tombstone(
      source.row.id,
      author,
      'Synthetic preceding withdrawal',
    );
    const prepared = await pointCommand(source.eventId);
    expect(prepared.command.facets).toEqual(['CONTROL', 'CONTRIBUTION']);
    expect(prepared.command.facts.some((f) => f.action === 'WITHDRAW')).toBe(
      true,
    );
    expect(
      await app
        .get<QualifiedPointsConsumer>(QUALIFIED_POINTS_CONSUMER)
        .advance(prepared.command),
    ).toMatchObject({
      status: 'COMPLETE',
      facets: [
        { facet: 'CONTROL' },
        { facet: 'CONTRIBUTION', disposition: 'SOURCE_REVOKED' },
      ],
    });
  });

  it('attests the durable Points second hop and uses the existing authoritative Levels consumer', async () => {
    const author = await subject(),
      source = await comment(author);
    const input = await pointCommand(source.eventId);
    await app
      .get<QualifiedPointsConsumer>(QUALIFIED_POINTS_CONSUMER)
      .advance(input.command);
    await app.get(LevelsService).updateDefinition(1, 1, author);
    const entry = await fixture.prisma.communityPointEntry.findUniqueOrThrow({
      where: { sourceEventId: source.eventId },
    });
    const awardedEvent = await sourceEvent(
      entry.id,
      'community-points.awarded.v1',
    );
    const awarded = await seal(awardedEvent.id);
    if (!('LEVELS' in awarded.inputs))
      throw new Error('Expected Levels descriptor.');
    expect(awarded.applicability).toEqual({
      POINTS: false,
      LEVELS: true,
      ACHIEVEMENTS: true,
    });
    const consume = async (eventId: string) => {
      const projection = await seal(eventId);
      if (!('LEVELS' in projection.inputs))
        throw new Error('Expected Levels projection.');
      const command = projection.inputs.LEVELS.command;
      const levels = app.get<LevelEventConsumer>(LEVEL_EVENT_CONSUMER);
      await levels.consume({
        eventId: command.eventId,
        eventName: command.eventName,
        eventVersion: command.eventVersion,
        producer: command.producer,
        category: 'integration',
        aggregateType: command.sourceType ?? undefined,
        aggregateId: command.sourceId ?? undefined,
        occurredAt: command.occurredAt,
        payload: { userId: command.userId },
      });
      return projection;
    };
    await consume(awardedEvent.id);
    expect(await app.get(LevelsService).progress(author)).toMatchObject({
      balance: 1,
      currentLevel: 1,
    });
    await comments.tombstone(
      source.row.id,
      author,
      'Synthetic source withdrawal',
    );
    const w = await sourceEvent(
      source.row.id,
      'comments.comment.tombstoned.v1',
    );
    await app
      .get<QualifiedPointsConsumer>(QUALIFIED_POINTS_CONSUMER)
      .advance((await pointCommand(w.id)).command);
    const reversal = await fixture.prisma.communityPointEntry.findUniqueOrThrow(
      { where: { reversesEntryId: entry.id } },
    );
    const reverseEvent = await sourceEvent(
      reversal.id,
      'community-points.reversed.v1',
    );
    const reversed = await consume(reverseEvent.id);
    expect(reversed.inputs.ACHIEVEMENTS.command.facts).toHaveLength(3);
    expect(await app.get(LevelsService).progress(author)).toMatchObject({
      balance: 0,
      currentLevel: 0,
    });
  });

  it('emits one comment withdrawal for two physically blocked concurrent requests', async () => {
    const author = await subject(),
      second = await subject(),
      source = await comment(author);
    const client = await pool.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      source.row.id,
    ]);
    const held = (
      await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
    ).rows[0].pid;
    const first = comments.tombstone(source.row.id, author, 'First contender');
    const other = comments.tombstone(source.row.id, second, 'Second contender');
    void first.catch(() => undefined);
    void other.catch(() => undefined);
    try {
      const until = performance.now() + 2000;
      let waiting = 0;
      do {
        waiting = Number(
          (
            await pool.query<{ count: string }>(
              `SELECT count(DISTINCT waiting.pid) FROM pg_locks waiting JOIN pg_locks held
          ON waiting.locktype=held.locktype AND waiting.database IS NOT DISTINCT FROM held.database
          AND waiting.classid=held.classid AND waiting.objid=held.objid AND waiting.objsubid=held.objsubid
          WHERE held.pid=$1 AND held.locktype='advisory' AND held.granted AND NOT waiting.granted`,
              [held],
            )
          ).rows[0].count,
        );
        if (waiting < 2 && performance.now() >= until)
          throw new Error(
            'Both real tombstones must be blocked before release.',
          );
      } while (waiting < 2);
    } finally {
      await client.query('ROLLBACK');
      client.release();
      await Promise.allSettled([first, other]);
    }
    const [a, b] = await Promise.all([first, other]);
    expect(a).toEqual(b);
    expect(a.isDeleted).toBe(true);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: {
          aggregateId: source.row.id,
          eventName: 'comments.comment.tombstoned.v1',
        },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.auditRecord.count({
        where: {
          targetId: source.row.id,
          action: 'comments.comment.tombstoned',
        },
      }),
    ).toBe(1);
    const prepared = await pointCommand(
      (await sourceEvent(source.row.id, 'comments.comment.tombstoned.v1')).id,
    );
    expect(prepared.command.facts).toHaveLength(3);
  });

  it('serializes a real configuration guard with the control transition', async () => {
    let release!: () => void;
    let entered!: (pid: number) => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<number>((resolve) => {
      entered = resolve;
    });
    const guard = app.get<PointRuleDeliveryGuard>(POINT_RULE_DELIVERY_GUARD);
    const writer = fixture.prisma.$transaction(async (tx) => {
      await guard.assert(tx, {
        eventName: 'news.article.published.v1',
        enabled: true,
      });
      const [backend] = await tx.$queryRaw<
        { pid: number }[]
      >`SELECT pg_backend_pid() AS pid`;
      entered(backend.pid);
      await held;
    });
    void writer.catch(() => undefined);
    const pid = await ready;
    const transition = control.setPaused(true, operator, 1n);
    void transition.catch(() => undefined);
    try {
      const deadline = performance.now() + 2000;
      let waiting = false;
      do {
        waiting = (
          await pool.query<{ waiting: boolean }>(
            'SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))) AS waiting',
            [pid],
          )
        ).rows[0].waiting;
        if (!waiting && performance.now() >= deadline)
          throw new Error(
            'The real control transition must wait for the configuration transaction.',
          );
      } while (!waiting);
    } finally {
      release();
      await Promise.allSettled([writer, transition]);
    }
    await writer;
    const paused = await transition;
    await control.setPaused(false, operator, paused.revision);
  });

  it('rejects unsupported active configuration atomically while preserving supported numeric edits', async () => {
    const author = await subject();
    const key = randomUUID();
    await fixture.prisma.communityPointRule.create({
      data: {
        key,
        eventName: 'synthetic.unsupported.v1',
        points: 3,
        enabled: false,
      },
    });
    const before = await fixture.prisma.communityPointRule.findUniqueOrThrow({
      where: { key },
    });
    await expect(
      app.get(CommunityPointsService).updateRule(key, 9, null, true, author),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      await fixture.prisma.communityPointRule.findUniqueOrThrow({
        where: { key },
      }),
    ).toEqual(before);
    expect(
      await fixture.prisma.auditRecord.count({
        where: { targetId: key, action: 'community-points.rule.updated' },
      }),
    ).toBe(0);
    expect(
      await app
        .get(CommunityPointsService)
        .updateRule('reputation.positive', 11, 24, true, author),
    ).toMatchObject({ points: 11, dailyLimit: 24 });
    const definitionKey = randomUUID();
    const definition = await fixture.prisma.achievementDefinition.create({
      data: {
        key: definitionKey,
        name: definitionKey,
        slug: definitionKey,
        color: '#123456',
        badge: 'rocket',
        createdById: author,
        updatedById: author,
      },
    });
    const achievements = app.get(AchievementsService);
    await expect(
      achievements.writeRule(
        {
          achievementId: definition.id,
          eventName: 'news.article.published.v1',
          recipientPayloadKey: 'title',
          repeatable: false,
          cooldownHours: 0,
          enabled: true,
        },
        author,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(
      await fixture.prisma.achievementRule.count({
        where: { achievementId: definition.id },
      }),
    ).toBe(0);
    const active =
      await fixture.prisma.gamificationActivation.findUniqueOrThrow({
        where: { destination: 'gamification.v1' },
      });
    const paused = await control.setPaused(true, operator, active.revision);
    await expect(
      app.get(CommunityPointsService).updateRule(key, 9, null, true, author),
    ).rejects.toMatchObject({ status: 400 });
    await control.setPaused(false, operator, paused.revision);
  });

  it('advances bounded discovery across irrelevant events without creating their deliveries', async () => {
    await drainDiscovery();
    const ids = Array.from({ length: 256 }, () => randomUUID());
    await fixture.prisma.outboxEvent.createMany({
      data: ids.map((id) => ({
        id,
        eventName: 'notifications.synthetic.v1',
        eventVersion: 1,
        eventCategory: 'integration',
        producer: 'synthetic.notifications',
        payload: {},
        occurredAt: new Date(),
      })),
    });
    const author = await subject(),
      article = await published(author);
    const first = await discovery.forward(64);
    expect(first).toMatchObject({ examined: 64, inserted: 0 });
    await drainDiscovery();
    expect(
      await fixture.prisma.gamificationDelivery.count({
        where: { eventId: { in: ids } },
      }),
    ).toBe(0);
    expect(
      await fixture.prisma.gamificationDelivery.count({
        where: { eventId: article.eventId },
      }),
    ).toBe(1);
    expect(
      (await admission.prepare(await claimed(article.eventId))).status,
    ).toBe('CREATED');
  });
});
