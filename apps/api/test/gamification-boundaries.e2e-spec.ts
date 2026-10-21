/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Integration Tests
 * 📄 File: apps/api/test/gamification-boundaries.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies real composed reads, idempotency and error behavior without public fixture pollution.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { IntegrationEventJob } from '@dss/jobs';
import { PrismaService } from '@api/core/database';
import {
  PROFILE_EXISTENCE_READER,
  type ProfileExistenceReader,
} from '@api/modules/users';
import {
  COMMUNITY_POINTS_BALANCE_READER,
  POINTS_RECIPIENT_EXISTENCE,
  type PointsRecipientExistence,
  type CommunityPointsBalanceReader,
} from '@api/modules/community-points';
import {
  LEVEL_POINTS_BALANCE_READER,
  type LevelPointsBalanceReader,
} from '@api/modules/levels';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { CommunityPointsService } from '../src/modules/community-points/application/services/community-points.service';
import { LevelsService } from '../src/modules/levels/application/services/levels.service';
import { AchievementsService } from '../src/modules/achievements/application/services/achievements.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('isolated gamification composition (e2e)', () => {
  let app: INestApplication<App>;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let points: CommunityPointsService;
  let levels: LevelsService;
  let achievements: AchievementsService;
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
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    );
    await app.init();
    points = app.get(CommunityPointsService);
    levels = app.get(LevelsService);
    achievements = app.get(AchievementsService);
  });
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  async function register() {
    const id = randomUUID();
    const authentication = app.get(AuthenticationPresentationService);
    return authentication.register({
      email: `boundary-${id}@dss.test`,
      username: `boundary-${id}`,
      displayName: 'Boundary Pilot',
      password: 'boundary-fixture-password-123',
    });
  }
  function event(
    subjectId: string,
    eventName: string,
    extra: Record<string, unknown> = {},
  ): IntegrationEventJob {
    return {
      eventId: randomUUID(),
      eventName,
      eventVersion: 1,
      category: 'integration',
      producer: 'dss.test.boundaries',
      aggregateType: 'BoundaryFixture',
      aggregateId: randomUUID(),
      occurredAt: new Date().toISOString(),
      payload: { userId: subjectId, ...extra },
    };
  }
  it('preserves profile existence independently of authentication eligibility and exposes no record', async () => {
    const subject = await register();
    const profiles = app.get<ProfileExistenceReader>(PROFILE_EXISTENCE_READER);
    const recipients = app.get<PointsRecipientExistence>(
      POINTS_RECIPIENT_EXISTENCE,
    );
    expect(await profiles.exists(randomUUID())).toBe(false);
    for (const status of [
      'ACTIVE',
      'BANNED',
      'DEACTIVATED',
      'DELETED',
    ] as const) {
      await prisma.user.update({
        where: { id: subject.user.id },
        data: { status },
      });
      expect(await recipients.exists(subject.user.id)).toBe(true);
    }
    await prisma.user.update({
      where: { id: subject.user.id },
      data: { status: 'ACTIVE' },
    });
    const publicBalance = app.get<CommunityPointsBalanceReader>(
      COMMUNITY_POINTS_BALANCE_READER,
    );
    expect(Object.keys(publicBalance)).toEqual(['balance']);
    expect(Object.isFrozen(publicBalance)).toBe(true);
    expect(await publicBalance.balance(subject.user.id)).toBe(0);
  });
  it('retains idempotent award/reversal and current level reads through the composed ports', async () => {
    const subject = await register();
    const definition = (await levels.definitions()).sort(
      (a, b) => a.level - b.level,
    )[0];
    expect(definition).toBeDefined();
    const weight = definition.threshold;
    const key = `boundary-${randomUUID()}`;
    const eventName = `test.${key}.v1`;
    await prisma.communityPointRule.create({
      data: {
        key,
        eventName,
        points: weight,
        payloadValue: null,
        dailyLimit: null,
        enabled: true,
      },
    });
    const activity = event(subject.user.id, eventName);
    const awards = await Promise.all([
      points.consume(activity),
      points.consume(activity),
    ]);
    expect(awards.map((result) => result.status).sort()).toEqual([
      'AWARDED',
      'DUPLICATE',
    ]);
    const entry = awards.find((result) => result.entry)?.entry;
    expect(entry).toBeTruthy();
    const levelBalance = app.get<LevelPointsBalanceReader>(
      LEVEL_POINTS_BALANCE_READER,
    );
    expect(await levelBalance.balance(subject.user.id)).toBe(weight);
    const upEvent = event(subject.user.id, 'community-points.awarded.v1');
    const upward = await Promise.all([
      levels.consume(upEvent),
      levels.consume(upEvent),
    ]);
    expect(upward.filter((result) => result.duplicate)).toHaveLength(1);
    const progress = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${subject.tokens.accessToken}`)
      .send({
        query:
          'query($id:ID!){levelProgress(userId:$id){balance currentLevel pointsIntoLevel}}',
        variables: { id: subject.user.id },
      })
      .expect(200);
    expect(progress.body as object).toMatchObject({
      data: {
        levelProgress: {
          balance: weight,
          currentLevel: definition.level,
          pointsIntoLevel: 0,
        },
      },
    });
    await points.reverse(
      entry!.id,
      subject.user.id,
      'Reverse isolated boundary fixture',
    );
    expect(await levelBalance.balance(subject.user.id)).toBe(0);
    expect(await levels.progress(subject.user.id)).toMatchObject({
      balance: 0,
      currentLevel: 0,
    });
    const down = await levels.consume(
      event(subject.user.id, 'community-points.reversed.v1'),
    );
    expect(down.transitions.map((value) => value.toLevel)).toContain(0);
    expect(
      await prisma.communityPointEntry.count({
        where: { userId: subject.user.id },
      }),
    ).toBe(2);
  });
  it('uses the same minimal existence boundary for achievement routing and missing recipients', async () => {
    const subject = await register();
    const suffix = randomUUID();
    const definition = await achievements.writeDefinition(
      {
        key: `boundary.${suffix}`,
        name: `Boundary ${suffix}`,
        color: '#112233',
        badge: 'rocket',
      },
      subject.user.id,
    );
    const eventName = `test.achievement-${suffix}.v1`;
    await achievements.writeRule(
      {
        achievementId: definition.id,
        eventName,
        recipientPayloadKey: 'userId',
        repeatable: false,
        cooldownHours: 0,
        dailyCap: null,
        enabled: true,
      },
      subject.user.id,
    );
    const activity = event(subject.user.id, eventName);
    const results = await Promise.all([
      achievements.consume(activity),
      achievements.consume(activity),
    ]);
    expect(
      results
        .flat()
        .map((value) => value.status)
        .sort(),
    ).toEqual(['AWARDED', 'DUPLICATE']);
    await expect(
      achievements.consume(event(randomUUID(), eventName)),
    ).rejects.toThrow('Achievement event user does not exist.');
  });
  it('propagates evidence failures without awarding points or manufacturing level progress', async () => {
    const subject = await register();
    const key = `failure-${randomUUID()}`;
    const eventName = `test.${key}.v1`;
    await prisma.communityPointRule.create({
      data: {
        key,
        eventName,
        points: 1,
        payloadValue: null,
        dailyLimit: null,
        enabled: true,
      },
    });
    const recipients = app.get<PointsRecipientExistence>(
      POINTS_RECIPIENT_EXISTENCE,
    );
    const read = jest
      .spyOn(recipients, 'exists')
      .mockRejectedValue(new Error('Synthetic recipient read failure'));
    try {
      await expect(
        points.consume(event(subject.user.id, eventName)),
      ).rejects.toThrow('Synthetic recipient read failure');
    } finally {
      read.mockRestore();
    }
    expect(await points.balance(subject.user.id)).toBe(0);
    await expect(
      points.consume(event(randomUUID(), eventName)),
    ).rejects.toThrow('Community Points event has no valid recipient.');
    const balances = app.get<LevelPointsBalanceReader>(
      LEVEL_POINTS_BALANCE_READER,
    );
    const balance = jest
      .spyOn(balances, 'balance')
      .mockRejectedValue(new Error('Synthetic balance read failure'));
    try {
      await expect(levels.progress(subject.user.id)).rejects.toThrow(
        'Synthetic balance read failure',
      );
    } finally {
      balance.mockRestore();
    }
  });
});
