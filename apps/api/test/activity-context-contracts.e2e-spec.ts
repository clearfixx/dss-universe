/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity Context E2E
 * 📄 File: apps/api/test/activity-context-contracts.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies minimal owner context, live personalization and unchanged Activity transport through migrated PostgreSQL.
 *
 * 🧠 Responsibilities:
 * • exercises real owner contracts, follow/block changes and bounded projection reads;
 * • verifies guest/member transport, failure behavior and deterministic fixture cleanup.
 *
 * 🏗️ Architecture:
 * Actual AppModule/root composition and all real migrations in an owned disposable schema.
 *
 * ⚠️ Important:
 * Context is not authentication; do not waive JWT checks or replace failed owner evidence with success.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import {
  USER_ACTIVITY_CONTEXT_READER,
  type UserActivityContextReader,
} from '@api/modules/users';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { ActivityFeedService } from '../src/modules/activity/application/services/activity-feed.service';
import {
  ACTIVITY_REPOSITORY,
  type ActivityRepository,
} from '../src/modules/activity/domain/repositories/activity.repository.interface';
import { UserSocialGraphService } from '../src/modules/users/application/services/user-social-graph.service';
import { UserBlockService } from '../src/modules/users/application/services/user-block.service';
import { UserPresenceService } from '../src/modules/users/application/services/user-presence.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Activity viewer context with owner contracts and PostgreSQL (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let feed: ActivityFeedService;
  let viewer: Awaited<ReturnType<typeof register>>;
  let followed: string;
  let other: string;
  let outbound: string;
  let inbound: string;
  const entries = new Map<string, string>();
  const refreshes: Promise<void>[] = [];
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    prisma = fixture.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    viewer = await register();
    [followed, other, outbound, inbound] = await Promise.all([
      profile(),
      profile(),
      profile(),
      profile(),
    ]);
    feed = app.get(ActivityFeedService);
  }, 60000);
  beforeEach(async () => {
    const presence = app.get(UserPresenceService);
    const touch = presence.touch.bind(presence) as UserPresenceService['touch'];
    const anonymous = presence.touchAnonymous.bind(
      presence,
    ) as UserPresenceService['touchAnonymous'];
    jest.spyOn(presence, 'touch').mockImplementation((...args) => {
      const pending = touch(...args);
      refreshes.push(pending);
      return pending;
    });
    jest.spyOn(presence, 'touchAnonymous').mockImplementation((...args) => {
      const pending = anonymous(...args);
      refreshes.push(pending);
      return pending;
    });
    await prisma.activityEntry.deleteMany();
    await prisma.activityFeedState.deleteMany();
    await prisma.userFollow.deleteMany();
    await prisma.userBlock.deleteMany();
    await prisma.user.update({
      where: { id: viewer.user.id },
      data: { interests: ['TypeScript'], status: 'ACTIVE' },
    });
    await prisma.userFollow.create({
      data: { followerId: viewer.user.id, followingId: followed },
    });
    await prisma.userBlock.createMany({
      data: [
        { blockerId: viewer.user.id, blockedId: outbound },
        { blockerId: inbound, blockedId: viewer.user.id },
      ],
    });
    entries.clear();
    const occurredAt = new Date(Date.now() - 10000);
    for (const [label, actorId, visibility, module, metadata, retractedAt] of [
      [
        'mention',
        other,
        'PUBLIC',
        'NEWS',
        { mentionedUserId: viewer.user.id },
        null,
      ],
      ['following', followed, 'MEMBERS', 'FORUM', { tags: 'typescript' }, null],
      [
        'interest',
        other,
        'PUBLIC',
        'NEWS',
        {
          tags: 'rust, TYPESCRIPT, backend',
          nested: { not: 'exposed' },
          marker: 'internal-fixture-marker',
        },
        null,
      ],
      [
        'own',
        viewer.user.id,
        'MEMBERS',
        'NEWS',
        { mentionedUserId: viewer.user.id, tags: 'typescript' },
        null,
      ],
      ['recent', other, 'PUBLIC', 'NEWS', {}, null],
      ['outbound', outbound, 'PUBLIC', 'NEWS', {}, null],
      ['inbound', inbound, 'PUBLIC', 'NEWS', {}, null],
      ['private', other, 'PRIVATE', 'NEWS', {}, null],
      ['retracted', other, 'PUBLIC', 'NEWS', {}, new Date()],
    ] as const) {
      const id = randomUUID();
      entries.set(label, id);
      await prisma.activityEntry.create({
        data: {
          id,
          sourceEventId: randomUUID(),
          actorId,
          module,
          action: 'created',
          subjectType: 'Fixture',
          subjectId: randomUUID(),
          visibility,
          metadata,
          occurredAt,
          retractedAt,
        },
      });
    }
  });
  afterEach(async () => {
    try {
      await Promise.all(refreshes.splice(0));
    } finally {
      jest.restoreAllMocks();
    }
  });
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  async function register() {
    const id = randomUUID();
    return app.get(AuthenticationPresentationService).register({
      email: 'activity-' + id + '@dss.test',
      username: 'activity-' + id,
      displayName: 'Activity Pilot',
      password: 'activity-context-fixture-123',
    });
  }
  async function profile() {
    const id = randomUUID();
    const user = await prisma.user.create({
      data: {
        email: 'context-' + id + '@dss.test',
        username: 'context-' + id,
        passwordHash: 'synthetic-fixture-hash',
      },
      select: { id: true },
    });
    return user.id;
  }
  function id(label: string) {
    const value = entries.get(label);
    if (!value) throw new Error('Missing fixture ' + label);
    return value;
  }
  it('publishes exactly three minimal arrays with both block directions', async () => {
    const context = await app
      .get<UserActivityContextReader>(USER_ACTIVITY_CONTEXT_READER)
      .readForViewer(viewer.user.id);
    expect(Object.keys(context).sort()).toEqual([
      'blockedIds',
      'followingIds',
      'interests',
    ]);
    expect(context.interests).toEqual(['TypeScript']);
    expect(context.followingIds).toEqual([followed]);
    expect([...context.blockedIds].sort()).toEqual([outbound, inbound].sort());
  });
  it('preserves personalized reasons, excludes blocks/private/retracted candidates and keeps reads independent of visits', async () => {
    const result = await feed.personalizedFeed(viewer.user.id);
    expect(result.items.map((item) => item.id)).toEqual(
      ['mention', 'following', 'interest', 'own', 'recent'].map(id),
    );
    expect(result.items.map((item) => item.reason)).toEqual([
      'MENTION',
      'FOLLOWING',
      'INTEREST',
      'OWN_ACTIVITY',
      'RECENT',
    ]);
    expect(result).toMatchObject({
      total: 5,
      unreadCount: 5,
      lastVisitedAt: null,
      recommendationMode: 'DETERMINISTIC',
    });
    expect(
      await prisma.activityFeedState.findUnique({
        where: { userId: viewer.user.id },
      }),
    ).toBeNull();
  });
  it('never requests Users context for a guest and retains public blocked actors', async () => {
    const read = jest.spyOn(
      app.get<UserActivityContextReader>(USER_ACTIVITY_CONTEXT_READER),
      'readForViewer',
    );
    const result = await feed.publicFeed();
    expect(result.total).toBe(5);
    expect(result.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([id('outbound'), id('inbound')]),
    );
    expect(
      result.items.every(
        (item) =>
          item.visibility === 'PUBLIC' &&
          !item.isUnread &&
          item.reason === 'RECENT',
      ),
    ).toBe(true);
    expect(result.unreadCount).toBe(0);
    expect(read).not.toHaveBeenCalled();
  });
  it.each(['ACTIVE', 'BANNED', 'DEACTIVATED', 'DELETED'] as const)(
    'does not add an account-status filter to the Users context reader for %s',
    async (status) => {
      await prisma.user.update({
        where: { id: viewer.user.id },
        data: { status },
      });
      expect(
        await app
          .get<UserActivityContextReader>(USER_ACTIVITY_CONTEXT_READER)
          .readForViewer(viewer.user.id),
      ).toMatchObject({ interests: ['TypeScript'], followingIds: [followed] });
    },
  );
  it('preserves missing-profile semantics without pretending the context reader authenticates a viewer', async () => {
    const missing = randomUUID();
    expect(
      await app
        .get<UserActivityContextReader>(USER_ACTIVITY_CONTEXT_READER)
        .readForViewer(missing),
    ).toEqual({ interests: [], followingIds: [], blockedIds: [] });
    const direct = await feed.personalizedFeed(missing);
    expect(direct.items.some((item) => item.visibility === 'MEMBERS')).toBe(
      true,
    );
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query: 'query { viewerActivityFeed { total } }' })
      .expect(200);
    const body = response.body as { errors?: unknown[]; data: unknown };
    expect(body.errors?.length).toBeGreaterThan(0);
    expect(body.data).toBeNull();
  });
  it('ignores retired follow/block edges and observes current profile interests on the next read', async () => {
    await prisma.userFollow.create({
      data: {
        followerId: viewer.user.id,
        followingId: other,
        deletedAt: new Date(),
      },
    });
    await prisma.userBlock.create({
      data: {
        blockerId: viewer.user.id,
        blockedId: other,
        deletedAt: new Date(),
      },
    });
    const result = await feed.personalizedFeed(viewer.user.id);
    expect(
      result.items.find((item) => item.id === id('interest'))?.reason,
    ).toBe('INTEREST');
    expect(result.items.find((item) => item.id === id('recent'))?.reason).toBe(
      'RECENT',
    );
    await prisma.user.update({
      where: { id: viewer.user.id },
      data: { interests: ['rust'] },
    });
    expect(
      (await feed.personalizedFeed(viewer.user.id)).items.find(
        (item) => item.id === id('interest'),
      )?.reason,
    ).toBe('INTEREST');
    await prisma.user.update({
      where: { id: viewer.user.id },
      data: { interests: [] },
    });
    expect(
      (await feed.personalizedFeed(viewer.user.id)).items.find(
        (item) => item.id === id('interest'),
      )?.reason,
    ).toBe('RECENT');
  });
  it('observes actual follow/unfollow use cases on the next projection without caching', async () => {
    const social = app.get(UserSocialGraphService);
    await social.unfollow(viewer.user.id, followed);
    expect(
      (await feed.personalizedFeed(viewer.user.id)).items.find(
        (item) => item.id === id('following'),
      )?.reason,
    ).toBe('INTEREST');
    await social.follow(viewer.user.id, followed);
    expect(
      (await feed.personalizedFeed(viewer.user.id)).items.find(
        (item) => item.id === id('following'),
      )?.reason,
    ).toBe('FOLLOWING');
  });
  it('observes actual outbound/inbound unblock/reblock operations without leaking blocked actors', async () => {
    const blocks = app.get(UserBlockService);
    for (const [actor, target, label] of [
      [viewer.user.id, outbound, 'outbound'],
      [inbound, viewer.user.id, 'inbound'],
    ]) {
      await blocks.unblock(actor, target);
      expect(
        (await feed.personalizedFeed(viewer.user.id)).items.some(
          (item) => item.id === id(label),
        ),
      ).toBe(true);
      await blocks.block(actor, target);
      expect(
        (await feed.personalizedFeed(viewer.user.id)).items.some(
          (item) => item.id === id(label),
        ),
      ).toBe(false);
    }
  });
  it('normalizes filters, paginates after ranking and counts unread before pagination', async () => {
    const result = await feed.personalizedFeed(
      viewer.user.id,
      [' NEWS ', 'news'],
      2,
      2,
    );
    expect(result).toMatchObject({
      total: 4,
      page: 2,
      limit: 2,
      totalPages: 2,
      unreadCount: 4,
    });
    expect(result.items.map((item) => item.id)).toEqual([
      id('own'),
      id('recent'),
    ]);
    const visitedAt = await feed.markVisited(viewer.user.id);
    expect((await feed.personalizedFeed(viewer.user.id)).unreadCount).toBe(0);
    await prisma.activityEntry.update({
      where: { id: id('recent') },
      data: { occurredAt: new Date(visitedAt.getTime() + 1000) },
    });
    const next = await feed.personalizedFeed(viewer.user.id, undefined, 1, 1);
    expect(next).toMatchObject({ unreadCount: 1, lastVisitedAt: visitedAt });
    expect(next.items[0]).toMatchObject({ id: id('mention'), isUnread: false });
  });
  it('keeps the 500 most recent eligible candidates before ranking, not an unbounded personalized list', async () => {
    await prisma.activityEntry.deleteMany();
    const base = Date.now() - 100000;
    const rows = Array.from({ length: 501 }, (_, index) => ({
      id: randomUUID(),
      sourceEventId: randomUUID(),
      actorId: index === 0 ? followed : other,
      module: 'NEWS',
      action: 'created',
      subjectType: 'Fixture',
      subjectId: randomUUID(),
      visibility: 'PUBLIC' as const,
      occurredAt: new Date(base + index),
    }));
    await prisma.activityEntry.createMany({ data: rows });
    const result = await feed.personalizedFeed(
      viewer.user.id,
      undefined,
      1,
      50,
    );
    expect(result).toMatchObject({
      total: 500,
      totalPages: 10,
      unreadCount: 500,
    });
    expect(result.items.some((item) => item.actorId === followed)).toBe(false);
    expect(result.items[0]?.id).toBe(rows[500].id);
    const beyond = await feed.personalizedFeed(
      viewer.user.id,
      undefined,
      11,
      50,
    );
    expect(beyond).toMatchObject({
      items: [],
      total: 500,
      totalPages: 10,
      unreadCount: 500,
    });
  });
  it('retracts an existing projection immediately on the next read', async () => {
    await prisma.activityEntry.update({
      where: { id: id('mention') },
      data: { retractedAt: new Date() },
    });
    const result = await feed.personalizedFeed(viewer.user.id);
    expect(result).toMatchObject({ total: 4, unreadCount: 4 });
    expect(result.items.some((item) => item.id === id('mention'))).toBe(false);
  });
  it('retains GraphQL projection shape and ISO timestamps without metadata or user context', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + viewer.tokens.accessToken)
      .send({
        query:
          'query { viewerActivityFeed { items { id actorId module action subjectType subjectId occurredAt isUnread reason score } total unreadCount generatedAt lastVisitedAt recommendationMode } }',
      })
      .expect(200);
    const body = response.body as {
      errors?: unknown[];
      data: {
        viewerActivityFeed: {
          items: Array<{ id: string; occurredAt: string; reason: string }>;
          total: number;
          unreadCount: number;
          generatedAt: string;
          lastVisitedAt: string | null;
        };
      };
    };
    expect(body.errors).toBeUndefined();
    const page = body.data.viewerActivityFeed;
    expect(page).toMatchObject({
      total: 5,
      unreadCount: 5,
      lastVisitedAt: null,
    });
    expect(page.items[0]).toMatchObject({
      id: id('mention'),
      reason: 'MENTION',
    });
    expect(new Date(page.generatedAt).toISOString()).toBe(page.generatedAt);
    expect(new Date(page.items[0].occurredAt).toISOString()).toBe(
      page.items[0].occurredAt,
    );
    for (const forbidden of [
      'metadata',
      'interests',
      'followingIds',
      'blockedIds',
      'passwordHash',
      'internal-fixture-marker',
    ])
      expect(JSON.stringify(body)).not.toContain(forbidden);
  });
  it('fails closed on a Users provider error before reading candidates, including GraphQL', async () => {
    const candidates = jest.spyOn(
      app.get<ActivityRepository>(ACTIVITY_REPOSITORY),
      'findFeedCandidates',
    );
    jest
      .spyOn(
        app.get<UserActivityContextReader>(USER_ACTIVITY_CONTEXT_READER),
        'readForViewer',
      )
      .mockRejectedValue(new Error('Users context unavailable'));
    await expect(feed.personalizedFeed(viewer.user.id)).rejects.toThrow(
      'Users context unavailable',
    );
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', 'Bearer ' + viewer.tokens.accessToken)
      .send({ query: 'query { viewerActivityFeed { total } }' })
      .expect(200);
    const body = response.body as { errors?: unknown[]; data: unknown };
    expect(body.errors?.length).toBeGreaterThan(0);
    expect(body.data).toBeNull();
    expect(candidates).not.toHaveBeenCalled();
  });
  it('propagates Activity candidate failures after real owner context rather than returning empty success', async () => {
    jest
      .spyOn(
        app.get<ActivityRepository>(ACTIVITY_REPOSITORY),
        'findFeedCandidates',
      )
      .mockRejectedValue(new Error('Activity unavailable'));
    await expect(feed.personalizedFeed(viewer.user.id)).rejects.toThrow(
      'Activity unavailable',
    );
  });
});
