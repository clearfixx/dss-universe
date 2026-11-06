/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Characterization
 * 📄 File: apps/api/test/gamification-delivery-characterization.e2e-spec.ts
 * 🎯 Purpose: Records existing owner rollback, ordering and replay boundaries.
 * 🧠 Responsibilities: Exercises real Points/Achievements evidence in a migrated owned schema.
 * 🏗️ Architecture: Test-only AppModule assembly; no automatic event dispatch.
 * ⚠️ Important: Characterized legacy behavior is not the desired consumer contract.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import {
  IdempotentIntegrationEventProcessor,
  type IntegrationEventJob,
} from '@dss/jobs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import { OutboxWriterService } from '../src/core/events';
import { CommunityPointsService } from '../src/modules/community-points/application/services/community-points.service';
import { AchievementsService } from '../src/modules/achievements/application/services/achievements.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Gamification delivery boundaries (characterization, not automatic wiring)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let points: CommunityPointsService;
  let achievements: AchievementsService;
  let outbox: OutboxWriterService;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    await app.init();
    points = app.get(CommunityPointsService);
    achievements = app.get(AchievementsService);
    outbox = app.get(OutboxWriterService);
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });

  async function event(): Promise<IntegrationEventJob> {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `${id}@dss.invalid`,
        username: id,
        passwordHash: 'synthetic-not-a-login',
        status: 'ACTIVE',
      },
    });
    return {
      eventId: randomUUID(),
      eventName: 'comments.comment.created.v1',
      eventVersion: 1,
      category: 'integration',
      producer: 'synthetic.characterization',
      payload: { authorId: id },
      aggregateType: 'Comment',
      aggregateId: randomUUID(),
      occurredAt: new Date().toISOString(),
    };
  }
  async function counts() {
    const p = fixture.prisma;
    return {
      entries: await p.communityPointEntry.count(),
      markers: await p.processedEvent.count(),
      audit: await p.auditRecord.count(),
      outbox: await p.outboxEvent.count(),
    };
  }

  it('rolls back Points entry, owned marker and Audit when Outbox append fails', async () => {
    const input = await event();
    const before = await counts();
    const append = jest
      .spyOn(outbox, 'append')
      .mockRejectedValueOnce(new Error('synthetic Outbox failure'));
    await expect(points.consume(input)).rejects.toThrow(
      'synthetic Outbox failure',
    );
    expect(await counts()).toEqual(before);
    append.mockRestore();
    await expect(points.consume(input)).resolves.toMatchObject({
      status: 'AWARDED',
    });
    const after = await counts();
    expect(after).toEqual({
      entries: before.entries + 1,
      markers: before.markers + 1,
      audit: before.audit + 1,
      outbox: before.outbox + 1,
    });
  });

  it('replays the handler after outer marker failure without a second Points effect', async () => {
    const input = await event();
    const before = await counts();
    let marked = false;
    let markerCalls = 0;
    const statuses: string[] = [];
    const processor = new IdempotentIntegrationEventProcessor(
      'synthetic.outer',
      {
        hasProcessed: () => Promise.resolve(marked),
        markProcessed: () => {
          if (++markerCalls === 1)
            return Promise.reject(new Error('synthetic outer marker failure'));
          marked = true;
          return Promise.resolve();
        },
      },
      async (data) => {
        statuses.push((await points.consume(data)).status);
      },
    );
    await expect(processor.process(input)).rejects.toThrow(
      'synthetic outer marker failure',
    );
    const committed = await counts();
    expect(committed).toEqual({
      entries: before.entries + 1,
      markers: before.markers + 1,
      audit: before.audit + 1,
      outbox: before.outbox + 1,
    });
    await expect(processor.process(input)).resolves.toMatchObject({
      duplicate: false,
    });
    expect(statuses).toEqual(['AWARDED', 'DUPLICATE']);
    expect(await counts()).toEqual(committed);
    await expect(processor.process(input)).resolves.toMatchObject({
      duplicate: true,
    });
    expect(statuses).toHaveLength(2);
  });

  it('retains Points source revocation before a late original without a synthetic debit', async () => {
    const input = await event();
    const sourceId = randomUUID();
    const original = {
      ...input,
      aggregateType: 'ReputationEntry',
      aggregateId: sourceId,
    };
    const reversal: IntegrationEventJob = {
      ...input,
      eventId: randomUUID(),
      eventName: 'reputation.direct.reversed.v1',
      payload: { reversesEntryId: sourceId },
    };
    const userId = (input.payload as { authorId: string }).authorId;
    await expect(points.consume(reversal)).resolves.toMatchObject({
      status: 'AWARDED',
      entry: null,
    });
    expect(
      await fixture.prisma.communityPointEntry.count({ where: { userId } }),
    ).toBe(0);
    expect(
      await fixture.prisma.communityPointRevokedSource.findUnique({
        where: {
          sourceType_sourceId: { sourceType: 'ReputationEntry', sourceId },
        },
      }),
    ).toMatchObject({ sourceEventId: reversal.eventId });
    await expect(points.consume(original)).resolves.toMatchObject({
      status: 'IGNORED',
      entry: null,
    });
    await expect(points.consume(original)).resolves.toMatchObject({
      status: 'DUPLICATE',
      entry: null,
    });
    expect(
      await fixture.prisma.communityPointEntry.count({ where: { userId } }),
    ).toBe(0);
  });

  async function configuredAchievement(input: IntegrationEventJob) {
    const userId = (input.payload as { authorId: string }).authorId;
    const key = randomUUID();
    const definition = await fixture.prisma.achievementDefinition.create({
      data: {
        key,
        name: key,
        slug: key,
        color: '#123456',
        badge: 'synthetic',
        createdById: userId,
        updatedById: userId,
      },
    });
    const rule = await fixture.prisma.achievementRule.create({
      data: {
        achievementId: definition.id,
        eventName: `synthetic.achievement-${key}.v1`,
        recipientPayloadKey: 'beneficiaryId',
        createdById: userId,
        updatedById: userId,
      },
    });
    return { userId, definition, rule };
  }

  it('characterizes Achievements late-original award after empty rollback, then explicit rollback replay', async () => {
    const input = await event();
    const { userId, definition, rule } = await configuredAchievement(input);
    const original = {
      ...input,
      eventName: rule.eventName,
      payload: { beneficiaryId: userId },
    };
    const rollback: IntegrationEventJob = {
      ...input,
      eventId: randomUUID(),
      eventName: 'synthetic.source.reversed.v1',
      payload: {
        reversedSourceType: input.aggregateType,
        reversedSourceId: input.aggregateId,
      },
    };
    await expect(achievements.consume(rollback)).resolves.toEqual([]);
    await expect(achievements.consume(original)).resolves.toMatchObject([
      { ruleId: rule.id, status: 'AWARDED', award: { revocation: null } },
    ]);
    const awarded = await fixture.prisma.achievementAward.findUniqueOrThrow({
      where: {
        achievementId_sourceEventId: {
          achievementId: definition.id,
          sourceEventId: original.eventId,
        },
      },
      include: { revocation: true },
    });
    expect(awarded.revocation).toBeNull();
    await expect(achievements.consume(rollback)).resolves.toMatchObject([
      { ruleId: rule.id, status: 'IGNORED', award: { id: awarded.id } },
    ]);
    await expect(achievements.consume(original)).resolves.toMatchObject([
      { ruleId: rule.id, status: 'DUPLICATE', award: null },
    ]);
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: definition.id },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.achievementAwardRevocation.count({
        where: { awardId: awarded.id },
      }),
    ).toBe(1);
  });

  it('characterizes a successor ignored before predecessor rollback and deduplicated thereafter', async () => {
    const input = await event();
    const { userId, definition, rule } = await configuredAchievement(input);
    const original = {
      ...input,
      eventName: rule.eventName,
      payload: { beneficiaryId: userId },
    };
    const successor = { ...original, eventId: randomUUID() };
    const rollback: IntegrationEventJob = {
      ...input,
      eventId: randomUUID(),
      eventName: 'synthetic.source.reversed.v1',
      payload: {
        reversedSourceType: input.aggregateType,
        reversedSourceId: input.aggregateId,
      },
    };
    await expect(achievements.consume(original)).resolves.toMatchObject([
      { ruleId: rule.id, status: 'AWARDED' },
    ]);
    await expect(achievements.consume(successor)).resolves.toMatchObject([
      { ruleId: rule.id, status: 'IGNORED', award: null },
    ]);
    await expect(achievements.consume(rollback)).resolves.toHaveLength(1);
    await expect(achievements.consume(successor)).resolves.toMatchObject([
      { ruleId: rule.id, status: 'DUPLICATE', award: null },
    ]);
    const awards = await fixture.prisma.achievementAward.findMany({
      where: { achievementId: definition.id },
      include: { revocation: true },
    });
    expect(awards).toHaveLength(1);
    expect(awards[0]).toMatchObject({ sourceEventId: original.eventId });
    expect(awards[0].revocation).not.toBeNull();
    expect(
      awards.some((award) => award.sourceEventId === successor.eventId),
    ).toBe(false);
  });
});
