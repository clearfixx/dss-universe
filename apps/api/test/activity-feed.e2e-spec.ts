import { randomUUID } from 'node:crypto';

import { Test, type TestingModule } from '@nestjs/testing';
import { ActivityVisibility } from '@prisma/client';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import { ActivityFeedService } from '../src/modules/activity';

describe('Activity Feed (e2e)', () => {
  let module: TestingModule;
  let app: INestApplication;
  let prisma: PrismaService;
  let feed: ActivityFeedService;
  const suffix = randomUUID().slice(0, 8);
  const ids = {
    viewer: randomUUID(),
    followed: randomUUID(),
    blocked: randomUUID(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    feed = app.get(ActivityFeedService);
    await prisma.user.createMany({
      data: [
        {
          id: ids.viewer,
          email: `feed-viewer-${suffix}@example.com`,
          username: `feed_viewer_${suffix}`,
          passwordHash: 'test',
          interests: ['typescript'],
        },
        {
          id: ids.followed,
          email: `feed-followed-${suffix}@example.com`,
          username: `feed_followed_${suffix}`,
          passwordHash: 'test',
        },
        {
          id: ids.blocked,
          email: `feed-blocked-${suffix}@example.com`,
          username: `feed_blocked_${suffix}`,
          passwordHash: 'test',
        },
      ],
    });
    await prisma.userFollow.create({
      data: { followerId: ids.viewer, followingId: ids.followed },
    });
    await prisma.userBlock.create({
      data: { blockerId: ids.viewer, blockedId: ids.blocked },
    });
    const occurredAt = new Date(Date.now() - 1_000);
    await prisma.activityEntry.createMany({
      data: [
        {
          sourceEventId: `feed-public-${suffix}`,
          actorId: ids.blocked,
          module: 'WIKI',
          action: 'wiki.published',
          subjectType: 'article',
          subjectId: randomUUID(),
          visibility: ActivityVisibility.PUBLIC,
          occurredAt,
        },
        {
          sourceEventId: `feed-following-${suffix}`,
          actorId: ids.followed,
          module: 'FORUM',
          action: 'topic.created',
          subjectType: 'topic',
          subjectId: randomUUID(),
          visibility: ActivityVisibility.MEMBERS,
          occurredAt,
        },
        {
          sourceEventId: `feed-interest-${suffix}`,
          actorId: randomUUID(),
          module: 'WIKI',
          action: 'wiki.published',
          subjectType: 'article',
          subjectId: randomUUID(),
          visibility: ActivityVisibility.PUBLIC,
          metadata: { tags: 'typescript,backend' },
          occurredAt,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.activityFeedState.deleteMany({
      where: { userId: ids.viewer },
    });
    await prisma.activityEntry.deleteMany({
      where: { sourceEventId: { endsWith: suffix } },
    });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await app.close();
  });

  it('keeps guests public and personalizes members without blocked actors', async () => {
    const guest = await feed.publicFeed(undefined, 1, 20);
    expect(guest.items.some((item) => item.visibility === 'MEMBERS')).toBe(
      false,
    );

    const member = await feed.personalizedFeed(ids.viewer, undefined, 1, 20);
    const owned = member.items.filter((item) => item.id.includes('never'));
    expect(owned).toHaveLength(0);
    expect(member.items.some((item) => item.actorId === ids.blocked)).toBe(
      false,
    );
    expect(
      member.items.find((item) => item.actorId === ids.followed)?.reason,
    ).toBe('FOLLOWING');
    expect(member.items.find((item) => item.module === 'WIKI')?.reason).toBe(
      'INTEREST',
    );
    expect(member.unreadCount).toBeGreaterThanOrEqual(2);
  });

  it('exposes the public projection without authentication or metadata', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/graphql')
      .send({
        query: `query { publicActivityFeed(input: { modules: ["WIKI"] }) {
          items { id module actorId isUnread reason }
          recommendationMode unreadCount
        } }`,
      })
      .expect(200);
    const body = response.body as {
      errors?: unknown;
      data: {
        publicActivityFeed: {
          recommendationMode: string;
          unreadCount: number;
          items: Array<{ actorId: string }>;
        };
      };
    };

    expect(body.errors).toBeUndefined();
    expect(body.data.publicActivityFeed).toMatchObject({
      recommendationMode: 'DETERMINISTIC',
      unreadCount: 0,
    });
    expect(
      body.data.publicActivityFeed.items.some(
        (item) => item.actorId === ids.blocked,
      ),
    ).toBe(true);
    expect(JSON.stringify(body)).not.toContain('metadata');
  });

  it('advances the visit cursor independently from reads', async () => {
    const before = await feed.personalizedFeed(ids.viewer, ['FORUM'], 1, 20);
    expect(before.items[0]?.isUnread).toBe(true);
    const visitedAt = await feed.markVisited(ids.viewer);
    const after = await feed.personalizedFeed(ids.viewer, ['FORUM'], 1, 20);
    expect(after.lastVisitedAt).toEqual(visitedAt);
    expect(after.items[0]?.isUnread).toBe(false);
  });
});
