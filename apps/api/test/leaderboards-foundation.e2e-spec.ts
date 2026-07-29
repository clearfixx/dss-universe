/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Leaderboards E2E
 * 📄 File: apps/api/test/leaderboards-foundation.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies PostgreSQL month/year/all-time rankings, ties, corrections,
 * inactive-account filtering, zero-point inclusion, and viewer context.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/database';

type RegisteredUser = {
  id: string;
  username: string;
  accessToken: string;
};

type LeaderboardResponse = {
  period: 'MONTH' | 'YEAR' | 'ALL_TIME';
  startsAt: string | null;
  endsAt: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  viewerRank: number | null;
  viewerCommunityPoints: number | null;
  items: Array<{
    rank: number;
    userId: string;
    username: string;
    communityPoints: number;
    currentLevel: number;
    reputation: number;
  }>;
};

describe('Leaderboards foundation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('projects explainable period rankings from the Community Points ledger', async () => {
    const oldest = await register('leader-oldest');
    const viewer = await register('leader-viewer');
    const tied = await register('leader-tied');
    const zero = await register('leader-zero');
    const inactive = await register('leader-inactive');
    const now = new Date();
    const thisMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 1),
    );
    const earlierThisYear =
      now.getUTCMonth() > 0
        ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15))
        : null;
    const lastYear = new Date(Date.UTC(now.getUTCFullYear() - 1, 5, 15));

    await prisma.user.update({
      where: { id: inactive.id },
      data: { status: 'DEACTIVATED', deactivatedAt: now },
    });
    const pointEntries = [
      entry(oldest.id, 50, lastYear, 'oldest-history'),
      entry(oldest.id, 10, thisMonth, 'oldest-month'),
      entry(viewer.id, 5, thisMonth, 'viewer-month'),
      entry(tied.id, 5, thisMonth, 'tied-month'),
      entry(inactive.id, 1_000, thisMonth, 'inactive-month'),
    ];
    if (earlierThisYear) {
      pointEntries.push(entry(viewer.id, 20, earlierThisYear, 'viewer-year'));
    }
    await prisma.communityPointEntry.createMany({
      data: pointEntries,
    });

    const firstMonthPage = await leaderboard(oldest.accessToken, 'MONTH', 1, 1);
    expect(firstMonthPage).toMatchObject({
      period: 'MONTH',
      viewerRank: 1,
      viewerCommunityPoints: 10,
      items: [
        {
          rank: 1,
          userId: oldest.id,
          communityPoints: 10,
          currentLevel: 2,
          reputation: 0,
        },
      ],
    });
    expect(firstMonthPage.totalPages).toBeGreaterThan(0);
    expect(firstMonthPage.startsAt).toContain(
      `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`,
    );
    expect(
      firstMonthPage.items.some((item) => item.userId === inactive.id),
    ).toBe(false);

    const viewerOutsidePage = await leaderboard(
      viewer.accessToken,
      'MONTH',
      1,
      1,
    );
    expect(viewerOutsidePage.viewerRank).toBeGreaterThan(1);
    expect(viewerOutsidePage.viewerCommunityPoints).toBe(5);

    const month = await leaderboard(viewer.accessToken, 'MONTH', 1, 100);
    expect(month.items.map((item) => item.userId)).toContain(zero.id);
    expect(
      month.items.find((item) => item.userId === zero.id)?.communityPoints,
    ).toBe(0);
    expect(
      month.items.find((item) => item.userId === viewer.id)?.rank,
    ).toBeLessThan(
      month.items.find((item) => item.userId === tied.id)?.rank ?? 0,
    );

    const year = await leaderboard(viewer.accessToken, 'YEAR', 1, 100);
    const allTime = await leaderboard(viewer.accessToken, 'ALL_TIME', 1, 100);
    expect(
      year.items.find((item) => item.userId === viewer.id)?.communityPoints,
    ).toBe(earlierThisYear ? 25 : 5);
    expect(
      allTime.items.find((item) => item.userId === oldest.id)?.communityPoints,
    ).toBe(60);
    expect(allTime.startsAt).toBeNull();

    await prisma.communityPointEntry.create({
      data: {
        ...entry(oldest.id, -10, thisMonth, 'oldest-correction'),
        reversesEntryId: (
          await prisma.communityPointEntry.findUniqueOrThrow({
            where: { sourceEventId: `leaderboard-oldest-month-${oldest.id}` },
          })
        ).id,
      },
    });
    const corrected = await leaderboard(oldest.accessToken, 'MONTH', 1, 100);
    expect(
      corrected.items.find((item) => item.userId === oldest.id)
        ?.communityPoints,
    ).toBe(0);

    const anonymous = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({ query: '{ leaderboard { total } }' })
      .expect(200);
    expect((anonymous.body as { errors?: unknown[] }).errors).toBeDefined();
  });

  function entry(
    userId: string,
    points: number,
    occurredAt: Date,
    source: string,
  ) {
    return {
      userId,
      ruleKey: 'leaderboards.e2e',
      points,
      reason: `Leaderboard E2E ${source}.`,
      sourceEventId: `leaderboard-${source}-${userId}`,
      sourceEventName: 'leaderboards.e2e.seeded.v1',
      occurredAt,
    };
  }

  async function register(prefix: string): Promise<RegisteredUser> {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const username = `${prefix}-${suffix}`;
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .send({
        query: `mutation Register($input: RegisterInput!) {
          register(input: $input) {
            user { id username }
            tokens { accessToken }
          }
        }`,
        variables: {
          input: {
            email: `${username}@dss.test`,
            username,
            displayName: prefix,
            password: 'dss-test-password',
          },
        },
      })
      .expect(200);
    const result = (
      response.body as {
        data: {
          register: {
            user: { id: string; username: string };
            tokens: { accessToken: string };
          };
        };
      }
    ).data.register;
    return {
      id: result.user.id,
      username: result.user.username,
      accessToken: result.tokens.accessToken,
    };
  }

  async function leaderboard(
    accessToken: string,
    period: 'MONTH' | 'YEAR' | 'ALL_TIME',
    page: number,
    limit: number,
  ): Promise<LeaderboardResponse> {
    const response = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        query: `query Leaderboard($input: LeaderboardInput) {
          leaderboard(input: $input) {
            period startsAt endsAt total page limit totalPages
            viewerRank viewerCommunityPoints
            items {
              rank userId username communityPoints currentLevel reputation
            }
          }
        }`,
        variables: { input: { period, page, limit } },
      })
      .expect(200);
    const body = response.body as {
      data: { leaderboard: LeaderboardResponse };
      errors?: unknown[];
    };
    expect(body.errors).toBeUndefined();
    return body.data.leaderboard;
  }
});

/**
 * Even the zero-point astronaut gets a place on the launch manifest.
 */
