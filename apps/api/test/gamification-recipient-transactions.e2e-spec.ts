/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Gamification Transaction E2E
 * 📄 File: apps/api/test/gamification-recipient-transactions.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies actual root-bound recipient reads and unchanged owned lifecycle evidence.
 *
 * 🧠 Responsibilities:
 * • proves transactional profile-provider failure aborts writes;
 * • compares manual/grant and private-helper revocation payloads in real PostgreSQL.
 *
 * 🏗️ Architecture:
 * Actual AppModule with fully migrated owned schema; synthetic fixtures are not login evidence.
 *
 * ⚠️ Important:
 * No successful authorization mock, disabled DB protection or increased operation budget.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { PrismaTransactionalProfileExistenceReader } from '@api/modules/users/infrastructure';
import { AppModule } from '../src/app.module';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import {
  ACHIEVEMENTS_REPOSITORY,
  type AchievementsRepository,
} from '../src/modules/achievements/domain/repositories/achievements.repository.interface';
import {
  CUSTOM_TITLES_REPOSITORY,
  type CustomTitlesRepository,
} from '../src/modules/custom-titles/domain/repositories/custom-titles.repository.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Gamification recipient transactions (e2e)', () => {
  let app: INestApplication;
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let prisma: PrismaService;
  let awards: AchievementsRepository;
  let titles: CustomTitlesRepository;
  let profiles: PrismaTransactionalProfileExistenceReader;
  let actor: string;
  let recipient: string;
  const reason = 'Synthetic unchanged lifecycle evidence';
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    prisma = fixture.prisma;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    await app.init();
    awards = app.get(ACHIEVEMENTS_REPOSITORY);
    titles = app.get(CUSTOM_TITLES_REPOSITORY);
    profiles = app.get(PrismaTransactionalProfileExistenceReader);
    actor = randomUUID();
    recipient = randomUUID();
    await prisma.user.createMany({
      data: [actor, recipient].map((id, index) => ({
        id,
        email: `${id}@dss.test`,
        username: `recipient${index}`,
        passwordHash: 'synthetic-not-a-login-credential',
        status: 'ACTIVE',
      })),
    });
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });
  async function target(kind: 'award' | 'title') {
    const key = randomUUID();
    const data = {
      name: key,
      slug: key,
      color: '#123456',
      badge: 'synthetic',
      createdById: actor,
      updatedById: actor,
    };
    return kind === 'award'
      ? prisma.achievementDefinition.create({ data: { ...data, key } })
      : prisma.customTitle.create({ data });
  }
  async function write(kind: 'award' | 'title', id: string) {
    if (kind === 'award') {
      const result = await awards.manualAward(recipient, id, reason, actor);
      if (result.status !== 'OK') throw Error(result.status);
      expect(result.award.achievement.id).toBe(id);
      expect(result.award.revocation).toBeNull();
      return result.award.id;
    }
    const result = await titles.grant(recipient, id, reason, actor);
    if (result.status !== 'OK') throw Error(result.status);
    expect(result.grant.title.id).toBe(id);
    expect(result.grant.selected).toBe(false);
    return result.grant.id;
  }
  async function snapshot() {
    return {
      awards: await prisma.achievementAward.count(),
      titles: await prisma.userTitleGrant.count(),
      audit: await prisma.auditRecord.count(),
      outbox: await prisma.outboxEvent.count(),
    };
  }
  function payload(kind: 'award' | 'title', id: string, definition: string) {
    return kind === 'award'
      ? {
          awardId: id,
          userId: recipient,
          achievementId: definition,
          kind: 'MANUAL',
          sourceType: null,
          sourceId: null,
        }
      : { userId: recipient, titleId: definition, grantId: id, reason };
  }
  for (const kind of ['award', 'title'] as const) {
    it(`${kind} uses the root-bound Users reader before INSERT and retains exact persisted evidence`, async () => {
      const definition = await target(kind);
      const read = jest.spyOn(profiles, 'exists');
      fixture.queries.length = 0;
      const id = await write(kind, definition.id);
      expect(read).toHaveBeenCalledTimes(1);
      expect(read.mock.calls[0][0]).not.toBe(prisma);
      expect(read.mock.calls[0][1]).toBe(recipient);
      const userRead = fixture.queries.findIndex(
        (query) =>
          /^SELECT\b/.test(query) &&
          query.includes(`FROM "${fixture.schema}"."users"`),
      );
      const ledgerInsert = fixture.queries.findIndex(
        (query) =>
          /^INSERT\b/.test(query) &&
          query.includes(
            kind === 'award' ? '"achievement_awards"' : '"user_title_grants"',
          ),
      );
      expect(userRead).toBeGreaterThanOrEqual(0);
      expect(ledgerInsert).toBeGreaterThan(userRead);
      expect(fixture.queries).toContain('COMMIT');
      const action =
        kind === 'award'
          ? 'achievements.award.awarded'
          : 'custom-titles.granted';
      const metadata = payload(kind, id, definition.id);
      const audit = await prisma.auditRecord.findFirstOrThrow({
        where: { targetId: id, action },
      });
      expect(audit).toMatchObject({
        actorType: 'USER',
        actorId: actor,
        targetType: kind === 'award' ? 'AchievementAward' : 'UserTitleGrant',
        metadata,
      });
      const events = await prisma.outboxEvent.findMany({
        where: { aggregateId: id, eventName: `${action}.v1` },
      });
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        eventVersion: 1,
        eventCategory: 'integration',
        producer:
          kind === 'award' ? 'dss.api.achievements' : 'dss.api.custom-titles',
        aggregateType: kind === 'award' ? 'AchievementAward' : 'UserTitleGrant',
        actorId: actor,
        payload: metadata,
      });
    });
    it(`${kind} aborts after a genuine transaction-local Users read fails`, async () => {
      const definition = await target(kind);
      const before = await snapshot();
      const error = new Error('Synthetic post-profile-read rejection');
      const exists = profiles.exists.bind(
        profiles,
      ) as PrismaTransactionalProfileExistenceReader['exists'];
      jest.spyOn(profiles, 'exists').mockImplementationOnce(async (...args) => {
        await exists(...args);
        throw error;
      });
      fixture.queries.length = 0;
      await expect(write(kind, definition.id)).rejects.toBe(error);
      expect(
        fixture.queries.some((query) =>
          query.includes(`FROM "${fixture.schema}"."users"`),
        ),
      ).toBe(true);
      expect(fixture.queries).toContain('ROLLBACK');
      expect(fixture.queries.some((query) => /^INSERT\b/.test(query))).toBe(
        false,
      );
      expect(await snapshot()).toEqual(before);
    });
    it(`${kind} revocation reuses private evidence with unchanged manual/grant history`, async () => {
      const definition = await target(kind);
      const id = await write(kind, definition.id);
      const result =
        kind === 'award'
          ? await awards.revoke(id, reason, actor)
          : await titles.revoke(id, reason, actor);
      expect(result.status).toBe('OK');
      const action =
        kind === 'award'
          ? 'achievements.award.revoked'
          : 'custom-titles.revoked';
      const metadata = payload(kind, id, definition.id);
      const audit = await prisma.auditRecord.findFirstOrThrow({
        where: { targetId: id, action },
      });
      expect(audit.metadata).toEqual(metadata);
      const event = await prisma.outboxEvent.findFirstOrThrow({
        where: { aggregateId: id, eventName: `${action}.v1` },
      });
      expect(event.payload).toEqual(metadata);
      if (kind === 'award')
        expect(await prisma.achievementAward.count({ where: { id } })).toBe(1);
      else expect(await prisma.userTitleGrant.count({ where: { id } })).toBe(1);
    });
  }
});
