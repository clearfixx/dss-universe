/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Producer Characterization
 * 📄 File: apps/api/test/reputation-producer-facts-characterization.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Pins genuine change/reversal evidence before adding producer qualification facts.
 *
 * 🧠 Responsibilities:
 * • distinguishes the compensating entry's event from its original source;
 * • exercises missing/ambiguous historical evidence in an owned migrated schema;
 * • preserves real ledger, Audit and Outbox writers without delivery activation.
 *
 * 🏗️ Architecture:
 * Real AppModule/repository; synthetic persisted subjects do not exercise login.
 *
 * ⚠️ Important:
 * Historical Outbox mutations are explicit fixture controls, not normal writer behavior.
 * These tests do not implement or attest the proposed P1 qualification journal.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import { AppModule } from '../src/app.module';
import {
  REPUTATION_REPOSITORY,
  type ReputationRepository,
} from '../src/modules/reputation/domain/repositories/reputation.repository.interface';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Reputation producer facts (characterization, no automatic delivery)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let repository: ReputationRepository;

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    await app.init();
    repository = app.get(REPUTATION_REPOSITORY);
  }, 60000);

  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture?.close();
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

  async function original(value: -1 | 1 = 1) {
    const actorId = await subject();
    const recipientId = await subject();
    const moderatorId = await subject();
    const entry = await repository.createDirect({
      actorId,
      recipientId,
      value,
      reason: 'Synthetic explained decision',
      cooldownStartedAfter: new Date(Date.now() - 86400000),
    });
    expect(entry).not.toBeNull();
    return { actorId, recipientId, moderatorId, entry: entry! };
  }

  function events(entryId: string) {
    return fixture.prisma.outboxEvent.findMany({
      where: {
        producer: 'dss.api.reputation',
        aggregateType: 'ReputationEntry',
        aggregateId: entryId,
      },
      select: {
        id: true,
        producer: true,
        eventName: true,
        eventVersion: true,
        eventCategory: true,
        aggregateType: true,
        aggregateId: true,
        actorId: true,
        payload: true,
      },
    });
  }

  it.each([-1, 1] as const)(
    'retains exact safe event fields for a %i decision and its opposite compensation',
    async (value) => {
      const { actorId, recipientId, moderatorId, entry } =
        await original(value);
      const before = await events(entry.id);
      expect(before).toHaveLength(1);
      const { id: originalEventId, ...originalEvidence } = before[0];
      expect(originalEventId).toMatch(/^[0-9a-f-]{36}$/);
      expect(originalEvidence).toEqual({
        producer: 'dss.api.reputation',
        eventName: 'reputation.direct.changed.v1',
        eventVersion: 1,
        eventCategory: 'integration',
        aggregateType: 'ReputationEntry',
        aggregateId: entry.id,
        actorId,
        payload: { recipientId, value },
      });
      const opposite = value === 1 ? -1 : 1;
      const reversal = await repository.reverse(
        entry.id,
        moderatorId,
        recipientId,
        opposite,
        'Synthetic reviewed compensation',
      );
      expect(reversal).not.toBeNull();
      const after = await events(reversal!.id);
      expect(after).toHaveLength(1);
      const { id: reversalEventId, ...reversalEvidence } = after[0];
      expect(reversalEventId).toMatch(/^[0-9a-f-]{36}$/);
      expect(reversalEvidence).toEqual({
        producer: 'dss.api.reputation',
        eventName: 'reputation.direct.reversed.v1',
        eventVersion: 1,
        eventCategory: 'integration',
        aggregateType: 'ReputationEntry',
        aggregateId: reversal!.id,
        actorId: moderatorId,
        payload: { recipientId, value: opposite, reversesEntryId: entry.id },
      });
      expect(reversalEventId).not.toBe(originalEventId);
      expect(after[0].aggregateId).not.toBe(entry.id);
      expect(await events(entry.id)).toEqual(before);
      expect(
        await fixture.prisma.reputationEntry.findUniqueOrThrow({
          where: { id: reversal!.id },
          select: { reversesEntryId: true, value: true, recipientId: true },
        }),
      ).toEqual({ reversesEntryId: entry.id, value: opposite, recipientId });
      expect(await repository.history(recipientId, 1, 20)).toMatchObject({
        total: 1,
        score: 0,
        items: [{ id: entry.id, reversal: { id: reversal!.id } }],
      });
    },
  );

  it('currently preserves a business reversal even when its historical original Outbox row is absent', async () => {
    const { recipientId, moderatorId, entry } = await original();
    const before = await events(entry.id);
    expect(before).toHaveLength(1);
    // Only this synthetic fixture's known event is removed; no history trigger is disabled.
    await fixture.prisma.outboxEvent.delete({ where: { id: before[0].id } });
    expect(await events(entry.id)).toEqual([]);
    const reversal = await repository.reverse(
      entry.id,
      moderatorId,
      recipientId,
      -1,
      'Synthetic missing-evidence control',
    );
    expect(reversal).not.toBeNull();
    expect(await events(reversal!.id)).toHaveLength(1);
    expect(
      await fixture.prisma.reputationEntry.count({ where: { recipientId } }),
    ).toBe(2);
  });

  it('currently preserves a business reversal with two synthetic candidate events for the original entry', async () => {
    const { actorId, recipientId, moderatorId, entry } = await original();
    const before = await events(entry.id);
    expect(before).toHaveLength(1);
    const duplicateId = await fixture.prisma.$transaction((transaction) =>
      app.get(OutboxWriterService).append(
        transaction,
        createEventEnvelope({
          name: 'reputation.direct.changed.v1',
          version: 1,
          category: 'integration',
          producer: 'dss.api.reputation',
          actorId,
          aggregate: { type: 'ReputationEntry', id: entry.id },
          payload: { recipientId, value: 1 },
        }),
      ),
    );
    expect(duplicateId).not.toBe(before[0].id);
    expect(await events(entry.id)).toHaveLength(2);
    const reversal = await repository.reverse(
      entry.id,
      moderatorId,
      recipientId,
      -1,
      'Synthetic ambiguous-evidence control',
    );
    expect(reversal).not.toBeNull();
    expect(await events(reversal!.id)).toHaveLength(1);
    expect(await events(entry.id)).toHaveLength(2);
  });
});

// UUIDs identify witnesses. Sorting their passports does not establish who arrived first. 🛰️
