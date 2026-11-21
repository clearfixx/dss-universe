/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub) × Community Points
 * 📄 File: apps/api/test/forum-points.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Proves Forum as a qualified Community Points producer through the real
 * root admission (discovery → claim → seal) and the Points owner.
 *
 * ⚠️ Important:
 * Uses an isolated schema in the disposable dss_test database only. Forum
 * services use fixture viewer facts; IAM is not claimed here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { createEmptyEditorDocument } from '@dss/editor';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import type { EditorDocumentNormalizer } from '@api/modules/editor';
import type { ForumViewerFacts } from '@api/modules/forum';
import {
  QUALIFIED_POINTS_CONSUMER,
  type QualifiedPointsConsumer,
} from '@api/modules/community-points';
import { ForumCurationService } from '@api/modules/forum/infrastructure/prisma-forum-curation';
import { ForumModerationService } from '@api/modules/forum/infrastructure/prisma-forum-moderation';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { PrismaPollsRepository } from '@api/modules/interactions/infrastructure/repositories/prisma-polls.repository';
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
import { verifyAdmissionSeal } from '../src/composition/gamification-delivery/infrastructure/admission-seal.codec';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Forum Community Points producer (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let admission: GamificationAdmission;
  let discovery: RoutingDiscovery;
  let publication: RoutingPublication;
  let points: QualifiedPointsConsumer;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let curation: ForumCurationService;
  let moderation: ForumModerationService;
  const claims = new Map<string, PublicationClaim>();
  const facts = new Map<string, Partial<ForumViewerFacts>>();
  const operator = {
    actorId: 'synthetic:forum-points',
    actorType: 'SERVICE' as const,
  };

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
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
    points = app.get(QUALIFIED_POINTS_CONSUMER);
    const control = app.get<RoutingControl>(GAMIFICATION_ROUTING_CONTROL);
    await control.prepare(operator);
    await control.activate(operator, 0n, 'synthetic:isolated-forum-points');

    const viewers = {
      read: (subjectId: string | null) =>
        Promise.resolve({
          subjectId,
          audienceKeys: [],
          seesAllCategories: false,
          moderatesAllCategories: false,
          canAssignModerators: false,
          canPurgeContent: false,
          ...(subjectId ? facts.get(subjectId) : {}),
        }),
    };
    const audit = app.get(AuditWriterService);
    const outbox = app.get(OutboxWriterService);
    const normalize = () => {
      const document = createEmptyEditorDocument('FORUM_REPLY');
      return {
        document,
        canonicalJson: JSON.stringify(document),
        plainText: 'Synthetic secret post',
        searchText: 'synthetic secret post',
      };
    };
    const editor = {
      normalizeForumTopic: normalize,
      normalizeForumReply: normalize,
    } as unknown as EditorDocumentNormalizer;
    structure = new ForumStructureService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
    );
    topics = new ForumTopicsService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      editor,
      structure,
      {
        project: (documentJson) => Promise.resolve({ documentJson, gates: [] }),
      },
      { project: (documentJson) => Promise.resolve({ documentJson }) },
    );
    const polls = new PrismaPollsRepository(fixture.prisma, audit, outbox);
    curation = new ForumCurationService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      { createPoll: (command) => polls.create(command) },
      topics,
    );
    moderation = new ForumModerationService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      topics,
    );
  }, 60000);

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture?.close();
    }
  });

  async function user(viewer: Partial<ForumViewerFacts> = {}) {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `pts-${id}@dss.test`,
        username: `pts-${id}`,
        passwordHash: 'synthetic-not-a-login',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function scene() {
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
      canPurgeContent: true,
    });
    const category = await structure.createCategory(admin, {
      slug: 'c-' + randomUUID().slice(0, 8),
      title: 'Category',
      description: null,
      position: 0,
      visibility: 'PUBLIC',
      audienceKeys: [],
      active: true,
    });
    const forum = await structure.createForum(admin, {
      categoryId: category.id,
      parentId: null,
      slug: 'help',
      title: 'Help',
      description: null,
      position: 0,
      allowsGatedContent: false,
      active: true,
    });
    const moderator = await user();
    await structure.assignModerator(admin, category.id, moderator);
    const author = await user();
    const { topic } = await topics.createTopic(author, {
      forumId: forum.id,
      kind: 'QUESTION',
      title: 'How do points work?',
      documentJson: 'q',
    });
    return { admin, moderator, author, topic };
  }

  async function reply(topicId: string) {
    const author = await user();
    const post = await topics.reply(author, {
      topicId,
      documentJson: 'a',
      replyToNumber: 1,
      quotedNumbers: [],
    });
    return { author, post };
  }

  async function events(aggregateId: string, eventName: string) {
    return fixture.prisma.outboxEvent.findMany({
      where: { aggregateId, eventName, producer: 'dss.api.forum' },
      select: { id: true },
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
      if (!batch.length) throw new Error('Expected a registered source claim.');
      for (const claim of batch) claims.set(claim.eventId, claim);
    }
    return claims.get(eventId)!;
  }

  async function credit(eventId: string) {
    const prepared = await admission.prepare(await claimed(eventId));
    if (prepared.status !== 'CREATED' && prepared.status !== 'REUSED')
      throw new Error(
        `Unexpected admission: ${prepared.status}${'code' in prepared ? ':' + prepared.code : ''}`,
      );
    const row = await fixture.prisma.gamificationAdmission.findUniqueOrThrow({
      where: { id: prepared.admission.admissionId },
    });
    const projection = verifyAdmissionSeal(
      row.projection,
      row.projectionDigest,
      row.encodedBytes,
    );
    if (!('POINTS' in projection.inputs))
      throw new Error('Expected a Points source.');
    expect(JSON.stringify(projection)).not.toMatch(/Synthetic secret/);
    expect(
      (await points.advance(projection.inputs.POINTS.command)).status,
    ).toBe('COMPLETE');
    return projection;
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

  it('credits topic +5, reply +1 and accepted answer +10 to the authors', async () => {
    const s = await scene();
    const [topicEvent] = await events(s.topic.id, 'forum.topic.created.v1');
    const topicSeal = await credit(topicEvent.id);
    expect(topicSeal.descriptor.id).toBe('forum.topics');
    expect(await balance(s.author)).toBe(5);

    const helper = await reply(s.topic.id);
    const [replyEvent] = await events(helper.post.id, 'forum.post.created.v1');
    expect((await credit(replyEvent.id)).descriptor.id).toBe('forum.replies');
    expect(await balance(helper.author)).toBe(1);

    await curation.acceptAnswer(s.author, s.topic.id, helper.post.id);
    const [answerEvent] = await events(
      helper.post.id,
      'forum.answer.credited.v1',
    );
    const answerSeal = await credit(answerEvent.id);
    expect(answerSeal.descriptor.id).toBe('forum.answers');
    expect(answerSeal.canonical.sourceType).toBe('ForumAnswerCredit');
    expect(await balance(helper.author)).toBe(11);
    // The accepting topic author earns nothing for accepting.
    expect(await balance(s.author)).toBe(5);

    // Replay is idempotent.
    await credit(answerEvent.id);
    expect(await balance(helper.author)).toBe(11);
  });

  it('pays a post its answer bonus once and keeps points after removal and purge', async () => {
    const s = await scene();
    const first = await reply(s.topic.id);
    const second = await reply(s.topic.id);
    await curation.acceptAnswer(s.author, s.topic.id, first.post.id);
    await curation.acceptAnswer(s.moderator, s.topic.id, second.post.id);
    await curation.acceptAnswer(s.moderator, s.topic.id, first.post.id);
    expect(
      await events(first.post.id, 'forum.answer.credited.v1'),
    ).toHaveLength(1);
    expect(
      await events(second.post.id, 'forum.answer.credited.v1'),
    ).toHaveLength(1);
    for (const post of [first, second]) {
      const [event] = await events(post.post.id, 'forum.answer.credited.v1');
      await credit(event.id);
      const [created] = await events(post.post.id, 'forum.post.created.v1');
      await credit(created.id);
    }
    expect(await balance(first.author)).toBe(11);
    expect(await balance(second.author)).toBe(11);
    await expect(
      fixture.prisma.forumPost.update({
        where: { id: first.post.id },
        data: { firstAcceptedById: s.moderator },
      }),
    ).rejects.toThrow();

    await moderation.purgePost(s.admin, first.post.id, 'Legal removal');
    expect(await balance(first.author)).toBe(11);
    // Purged posts keep owned evidence; a late admission still verifies.
    const [created] = await events(first.post.id, 'forum.post.created.v1');
    await credit(created.id);
    expect(await balance(first.author)).toBe(11);
  });

  it('gives the topic opener no reply points for post #1 and replies in own topic earn +1', async () => {
    const s = await scene();
    expect(
      await fixture.prisma.outboxEvent.count({
        where: {
          producer: 'dss.api.forum',
          eventName: 'forum.post.created.v1',
          payload: { path: ['topicId'], equals: s.topic.id },
        },
      }),
    ).toBe(0);
    const [topicEvent] = await events(s.topic.id, 'forum.topic.created.v1');
    await credit(topicEvent.id);
    // Step past the 60-second posting cooldown without waiting.
    await fixture.prisma.forumPostingCooldown.update({
      where: { userId: s.author },
      data: { lastPostAt: new Date(Date.now() - 120_000) },
    });
    const own = await topics.reply(s.author, {
      topicId: s.topic.id,
      documentJson: 'self',
      replyToNumber: null,
      quotedNumbers: [],
    });
    const [ownEvent] = await events(own.id, 'forum.post.created.v1');
    await credit(ownEvent.id);
    expect(await balance(s.author)).toBe(6);
  });

  it('enables the three Forum rules with the owner-approved limits', async () => {
    const rules = await fixture.prisma.communityPointRule.findMany({
      where: { key: { startsWith: 'forum.' } },
      orderBy: { key: 'asc' },
      select: { key: true, eventName: true, points: true, dailyLimit: true },
    });
    expect(rules).toEqual([
      {
        key: 'forum.answer.accepted',
        eventName: 'forum.answer.credited.v1',
        points: 10,
        dailyLimit: 10,
      },
      {
        key: 'forum.reply.created',
        eventName: 'forum.post.created.v1',
        points: 1,
        dailyLimit: 50,
      },
      {
        key: 'forum.topic.created',
        eventName: 'forum.topic.created.v1',
        points: 5,
        dailyLimit: 10,
      },
    ]);
  });
});
