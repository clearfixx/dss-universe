/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Reputation Qualification Integration Tests
 * 📄 File: apps/api/test/reputation-qualification.e2e-spec.ts
 * 🎯 Purpose: Proves actual producer-to-canonical-root-to-qualified-owner behavior.
 * 🧠 Responsibilities: Exercises order, legacy provenance, rollback and coherent reads.
 * 🏗️ Architecture: Real AppModule and migrated owned schema; no automatic delivery or Auth mocks.
 * ⚠️ Important: Explicit CONTINUE calls advance a finite fixture, never retry failed assertions.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import { CanonicalOutboxReader } from '@api/core/events/infrastructure';
import {
  AchievementsRuntimeModule,
  QUALIFIED_ACHIEVEMENT_CONSUMER,
  type QualifiedAchievementConsumer,
  type QualifiedAchievementCommand,
} from '@api/modules/achievements';
import {
  REPUTATION_REPOSITORY,
  type ReputationRepository,
} from '../src/modules/reputation/domain/repositories/reputation.repository.interface';
import { PrismaReputationQualificationWriter } from '../src/modules/reputation/infrastructure/repositories/prisma-reputation-qualification.writer';
import { PrismaReputationQualificationReader } from '../src/modules/reputation/infrastructure/repositories/prisma-reputation-qualification.reader';
import { ReputationQualificationAdapter } from '../src/composition/reputation/infrastructure/reputation-qualification.adapter';
import { AppModule } from '../src/app.module';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Reputation qualification P1 (inactive integration e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let repository: ReputationRepository;
  let root: ReputationQualificationAdapter;
  let consumer: QualifiedAchievementConsumer;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    const module = await Test.createTestingModule({
      imports: [AppModule, AchievementsRuntimeModule],
    })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    await app.init();
    repository = app.get(REPUTATION_REPOSITORY);
    root = app.get(ReputationQualificationAdapter);
    consumer = app.get(QUALIFIED_ACHIEVEMENT_CONSUMER);
  }, 60000);
  afterEach(async () => {
    jest.restoreAllMocks();
    await fixture.prisma.achievementRule.updateMany({
      data: { enabled: false },
    });
  });
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
  async function scenario(legacy = false, value: -1 | 1 = 1) {
    const actorId = await subject(),
      recipientId = await subject(),
      moderatorId = await subject();
    const input = {
      actorId,
      recipientId,
      value,
      reason: 'Synthetic explainable decision',
      cooldownStartedAfter: new Date(Date.now() - 86400000),
    };
    const entry = legacy
      ? await fixture.prisma.reputationEntry.create({
          data: { actorId, recipientId, value, reason: input.reason },
        })
      : await repository.createDirect(input);
    if (!entry) throw new Error('Expected a new synthetic original.');
    const event = await fixture.prisma.outboxEvent.findFirst({
      where: { producer: 'dss.api.reputation', aggregateId: entry.id },
    });
    return {
      actorId,
      recipientId,
      moderatorId,
      entry,
      eventId: event?.id ?? '',
      input,
    };
  }
  async function reverse(s: Awaited<ReturnType<typeof scenario>>) {
    const entry = await repository.reverse(
      s.entry.id,
      s.moderatorId,
      s.recipientId,
      s.input.value === 1 ? -1 : 1,
      'Synthetic reviewed reversal',
    );
    if (!entry) throw new Error('Expected a new synthetic reversal.');
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: { producer: 'dss.api.reputation', aggregateId: entry.id },
    });
    return { entry, eventId: event.id };
  }
  async function command(eventId: string) {
    const prepared = await root.prepare(eventId);
    if (prepared.status !== 'READY')
      throw new Error(`Unexpected blocked fixture: ${prepared.code}`);
    return prepared.command;
  }
  async function drain(input: QualifiedAchievementCommand) {
    for (let step = 0; step < 12; step++) {
      const result = await consumer.advance(input);
      if (result.status !== 'CONTINUE') return result;
      expect(result.examined).toBeLessThanOrEqual(64);
    }
    throw new Error('Finite producer fixture did not complete.');
  }
  async function rule(actor: string, eventName: string) {
    const id = randomUUID();
    const definition = await fixture.prisma.achievementDefinition.create({
      data: {
        key: id,
        name: 'Synthetic producer award',
        slug: id,
        color: '#112233',
        badge: 'synthetic',
        createdById: actor,
        updatedById: actor,
      },
    });
    const created = await fixture.prisma.achievementRule.create({
      data: {
        achievementId: definition.id,
        eventName,
        recipientPayloadKey: 'recipientId',
        createdById: actor,
        updatedById: actor,
      },
    });
    return { definition, rule: created };
  }
  async function oldEvent(
    s: Awaited<ReturnType<typeof scenario>>,
    mode = 'valid',
  ) {
    const eventId = await fixture.prisma.$transaction((transaction) =>
      app.get(OutboxWriterService).append(
        transaction,
        createEventEnvelope({
          name: 'reputation.direct.changed.v1',
          version: mode === 'version' ? 2 : 1,
          category: mode === 'category' ? 'system' : 'integration',
          producer: 'dss.api.reputation',
          actorId: mode === 'actor' ? s.moderatorId : s.actorId,
          aggregate: { type: 'ReputationEntry', id: s.entry.id },
          occurredAt: '2020-01-01T00:00:00Z',
          payload: {
            recipientId: s.recipientId,
            value: mode === 'scalar' ? '1' : s.input.value,
          },
        }),
      ),
    );
    await fixture.prisma.outboxEvent.update({
      where: { id: eventId },
      data: { createdAt: new Date('2020-01-01T00:00:00Z') },
    });
    return eventId;
  }
  async function snapshot() {
    return {
      ledger: await fixture.prisma.reputationEntry.count(),
      audit: await fixture.prisma.auditRecord.count(),
      outbox: await fixture.prisma.outboxEvent.count(),
      events: await fixture.prisma.reputationQualificationEvent.count(),
      facts: await fixture.prisma.reputationQualificationFact.count(),
      states: await fixture.prisma.reputationQualificationState.findMany({
        orderBy: { originalEntryId: 'asc' },
      }),
    };
  }

  it.each([-1, 1] as const)(
    'binds native %i decisions and compensations without activating delivery',
    async (value) => {
      const s = await scenario(false, value);
      const original = await command(s.eventId);
      expect(original.facts).toHaveLength(1);
      expect(original.event.payload).toEqual({
        recipientId: s.recipientId,
        value,
      });
      const reversed = await reverse(s);
      const prepared = await command(reversed.eventId);
      expect(prepared.facts).toHaveLength(3);
      expect(
        prepared.facts.find((fact) => fact.action === 'WITHDRAW'),
      ).toMatchObject({
        sourceId: s.entry.id,
        revision: '2',
        qualificationFactId: original.facts[0].factId,
        qualificationEventId: s.eventId,
      });
      expect(
        prepared.facts.find(
          (fact) => fact.factId === prepared.contribution?.factId,
        ),
      ).toMatchObject({
        sourceKind: '@event',
        sourceId: reversed.eventId,
        action: 'QUALIFY',
      });
      expect(prepared.event.sourceId).toBe(reversed.entry.id);
      expect(await fixture.prisma.achievementAward.count()).toBe(0);
      expect(await fixture.prisma.gamificationActivation.count()).toBe(0);
      expect(await fixture.prisma.gamificationDelivery.count()).toBe(0);
    },
  );

  it('retires a real original award, preserves manual history and rewards a configured reversal independently', async () => {
    const s = await scenario();
    const direct = await rule(s.actorId, 'reputation.direct.changed.v1');
    const reversal = await rule(s.actorId, 'reputation.direct.reversed.v1');
    const original = await command(s.eventId);
    expect(await drain(original)).toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'AWARDED' }],
    });
    const award = await fixture.prisma.achievementAward.findFirstOrThrow({
      where: { sourceEventId: s.eventId },
    });
    const manual = await fixture.prisma.achievementAward.create({
      data: {
        achievementId: direct.definition.id,
        userId: s.recipientId,
        kind: 'MANUAL',
        reason: 'Synthetic manual grant',
        awardedById: s.moderatorId,
        sourceType: 'ReputationEntry',
        sourceId: s.entry.id,
      },
    });
    const reversed = await reverse(s);
    const control = await command(reversed.eventId);
    expect(await drain(control)).toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'AWARDED' }],
    });
    expect(
      await fixture.prisma.achievementAwardRevocation.findUnique({
        where: { awardId: award.id },
      }),
    ).not.toBeNull();
    expect(
      await fixture.prisma.achievementAwardRevocation.findUnique({
        where: { awardId: manual.id },
      }),
    ).toBeNull();
    expect(
      await fixture.prisma.achievementAward.count({
        where: {
          achievementId: reversal.definition.id,
          sourceEventId: reversed.eventId,
        },
      }),
    ).toBe(1);
    expect(await drain(control)).toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'DUPLICATE' }],
    });
    expect((await drain(original)).status).toBe('COMPLETE');
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: direct.definition.id, kind: 'RULE' },
      }),
    ).toBe(1);
  });

  it('applies withdrawal before late fresh and previously prepared original commands', async () => {
    const s = await scenario();
    const direct = await rule(s.actorId, 'reputation.direct.changed.v1');
    const reward = await rule(s.actorId, 'reputation.direct.reversed.v1');
    const stale = await command(s.eventId);
    const reversed = await reverse(s);
    expect((await drain(await command(reversed.eventId))).status).toBe(
      'COMPLETE',
    );
    expect((await drain(stale)).status).toBe('COMPLETE');
    expect((await drain(await command(s.eventId))).status).toBe('COMPLETE');
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: direct.definition.id },
      }),
    ).toBe(0);
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: reward.definition.id },
      }),
    ).toBe(1);
  });

  it('uses the caller Repeatable Read snapshot without opening a nested preparation transaction', async () => {
    const s = await scenario();
    const nested = jest.fn(() => {
      throw new Error('Unexpected nested preparation transaction.');
    });
    const core = new CanonicalOutboxReader();
    const actual = core.read.bind(core) as CanonicalOutboxReader['read'];
    const bound = new ReputationQualificationAdapter(
      { $transaction: nested } as unknown as PrismaService,
      new PrismaReputationQualificationReader(),
      core,
    );
    let isolation = '';
    jest.spyOn(core, 'read').mockImplementationOnce(async (...args) => {
      const [row] = await args[0].$queryRaw<{ isolation: string }[]>`
        SELECT current_setting('transaction_isolation') AS isolation`;
      isolation = row.isolation;
      await reverse(s);
      return actual(...args);
    });
    const captured = await fixture.prisma.$transaction(
      (transaction) => bound.prepareInTransaction(transaction, s.eventId),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    expect(captured.status).toBe('READY');
    if (captured.status !== 'READY')
      throw new Error('Expected prepared fixture.');
    expect(isolation).toBe('repeatable read');
    expect(captured.command.facts).toHaveLength(1);
    expect(nested).not.toHaveBeenCalled();
    const current = await command(s.eventId);
    expect(current.facts).toHaveLength(2);
    expect(current.facts.some((fact) => fact.action === 'WITHDRAW')).toBe(true);
  });

  it('adopts verified pre-cutoff predecessor context without replaying or modifying its canonical event', async () => {
    const s = await scenario(true);
    const eventId = await oldEvent(s);
    const before = await fixture.prisma.outboxEvent.findUniqueOrThrow({
      where: { id: eventId },
    });
    const reversed = await reverse(s);
    const control = await command(reversed.eventId);
    expect(
      control.facts.find(
        (fact) =>
          fact.revision === '1' && fact.sourceKind === 'ReputationEntry',
      ),
    ).toMatchObject({ canonicalEventId: eventId });
    expect((await drain(control)).status).toBe('COMPLETE');
    expect(
      await fixture.prisma.achievementAward.count({
        where: { sourceEventId: eventId },
      }),
    ).toBe(0);
    expect(
      await fixture.prisma.outboxEvent.findUniqueOrThrow({
        where: { id: eventId },
      }),
    ).toEqual(before);
    expect(
      await fixture.prisma.reputationQualificationEvent.findUnique({
        where: { eventId },
      }),
    ).toMatchObject({ provenance: 'VERIFIED_LEGACY' });
  });

  it.each(['missing', 'duplicate', 'scalar', 'actor', 'version', 'category'])(
    'preserves reversal but blocks unproven legacy %s evidence',
    async (mode) => {
      const s = await scenario(true);
      if (mode !== 'missing') await oldEvent(s, mode);
      if (mode === 'duplicate') await oldEvent(s);
      const reversed = await reverse(s);
      expect(await root.prepare(reversed.eventId)).toEqual({
        status: 'BLOCKED',
        code: 'LEGACY_PROVENANCE_REQUIRED',
      });
      expect(
        await fixture.prisma.reputationQualificationState.findUnique({
          where: { originalEntryId: s.entry.id },
        }),
      ).toMatchObject({
        status: 'BLOCKED_LEGACY',
        revision: null,
        qualificationFactId: null,
        currentFactId: null,
      });
      expect(
        await fixture.prisma.reputationEntry.count({
          where: { recipientId: s.recipientId },
        }),
      ).toBe(2);
    },
  );

  it('requires reviewed mapping for an existing unbound legacy rule award', async () => {
    const s = await scenario(true);
    const eventId = await oldEvent(s);
    const { definition, rule: legacyRule } = await rule(
      s.actorId,
      'reputation.direct.changed.v1',
    );
    const award = await fixture.prisma.achievementAward.create({
      data: {
        achievementId: definition.id,
        ruleId: legacyRule.id,
        userId: s.recipientId,
        kind: 'RULE',
        reason: 'Synthetic historical award',
        sourceEventId: eventId,
        sourceEventName: 'reputation.direct.changed.v1',
        sourceType: 'ReputationEntry',
        sourceId: s.entry.id,
      },
    });
    const reversed = await reverse(s);
    expect(await drain(await command(reversed.eventId))).toMatchObject({
      status: 'BLOCKED',
      code: 'BLOCKED_LEGACY_MAPPING',
    });
    expect(
      await fixture.prisma.achievementAwardRevocation.findUnique({
        where: { awardId: award.id },
      }),
    ).toBeNull();
    expect(
      await fixture.prisma.achievementAwardQualification.findUnique({
        where: { awardId: award.id },
      }),
    ).toBeNull();
  });

  it('blocks missing canonical evidence and preserves unknown read failure identity', async () => {
    const s = await scenario();
    const core = app.get(CanonicalOutboxReader);
    const failure = new Error('Synthetic canonical query failure');
    jest.spyOn(core, 'read').mockRejectedValueOnce(failure);
    await expect(root.prepare(s.eventId)).rejects.toBe(failure);
    await fixture.prisma.outboxEvent.delete({ where: { id: s.eventId } });
    expect(await root.prepare(s.eventId)).toEqual({
      status: 'BLOCKED',
      code: 'CANONICAL_EVIDENCE_MISMATCH',
    });
    expect(await root.prepare('not-an-event')).toEqual({
      status: 'BLOCKED',
      code: 'INVALID_EVENT_ID',
    });
    expect(await root.prepare(randomUUID())).toEqual({
      status: 'BLOCKED',
      code: 'MISSING_PRODUCER_EVIDENCE',
    });
  });

  it('rolls back the business reversal when legacy evidence lookup fails as infrastructure', async () => {
    const s = await scenario(true);
    const before = await snapshot();
    const failure = new Error('Synthetic legacy lookup failure');
    jest
      .spyOn(app.get(CanonicalOutboxReader), 'candidates')
      .mockRejectedValueOnce(failure);
    await expect(reverse(s)).rejects.toBe(failure);
    expect(await snapshot()).toEqual(before);
  });

  it.each(['direct', 'reverse'] as const)(
    'rolls back all evidence after genuine %s qualification persistence fails',
    async (stage) => {
      const s = await scenario(stage === 'direct');
      const writer = app.get(PrismaReputationQualificationWriter);
      const failure = new Error('Synthetic post-qualification failure');
      const before = await snapshot();
      let persisted = false;
      if (stage === 'direct') {
        const actual = writer.direct.bind(
          writer,
        ) as PrismaReputationQualificationWriter['direct'];
        jest.spyOn(writer, 'direct').mockImplementation(async (...args) => {
          await actual(...args);
          persisted = true;
          throw failure;
        });
      } else {
        const actual = writer.reverse.bind(
          writer,
        ) as PrismaReputationQualificationWriter['reverse'];
        jest.spyOn(writer, 'reverse').mockImplementation(async (...args) => {
          await actual(...args);
          persisted = true;
          throw failure;
        });
      }
      await expect(
        stage === 'direct'
          ? repository.createDirect({
              ...s.input,
              cooldownStartedAfter: s.entry.createdAt,
            })
          : reverse(s),
      ).rejects.toBe(failure);
      expect(persisted).toBe(true);
      expect(await snapshot()).toEqual(before);
    },
  );

  it('uses one actual repeatable snapshot across concurrent producer and synthetic canonical changes', async () => {
    const s = await scenario();
    const core = app.get(CanonicalOutboxReader);
    const actual = core.read.bind(core) as CanonicalOutboxReader['read'];
    let isolation = '';
    jest.spyOn(core, 'read').mockImplementationOnce(async (...args) => {
      const [row] = await args[0].$queryRaw<
        { isolation: string }[]
      >`SELECT current_setting('transaction_isolation') AS isolation`;
      isolation = row.isolation;
      await reverse(s);
      // Explicit fixture mutation distinguishes a repeatable snapshot from a later RC read.
      await fixture.prisma.outboxEvent.update({
        where: { id: s.eventId },
        data: { payload: { recipientId: s.recipientId, value: -1 } },
      });
      return actual(...args);
    });
    fixture.queries.length = 0;
    const captured = await command(s.eventId);
    expect(captured.facts).toHaveLength(1);
    expect(isolation).toBe('repeatable read');
    expect(captured.event.payload).toEqual({
      recipientId: s.recipientId,
      value: 1,
    });
    expect(
      (
        await fixture.prisma.outboxEvent.findUniqueOrThrow({
          where: { id: s.eventId },
        })
      ).payload,
    ).toEqual({ recipientId: s.recipientId, value: -1 });
    await fixture.prisma.outboxEvent.update({
      where: { id: s.eventId },
      data: { payload: { recipientId: s.recipientId, value: 1 } },
    });
    const fresh = await command(s.eventId);
    expect(fresh.facts).toHaveLength(2);
    expect(fresh.facts.some((fact) => fact.action === 'WITHDRAW')).toBe(true);
  });

  it('rejects an uncommitted original ID, then uses its native pointer after commit', async () => {
    const s = await scenario(true);
    const writer = app.get(PrismaReputationQualificationWriter);
    const actual = writer.direct.bind(
      writer,
    ) as PrismaReputationQualificationWriter['direct'];
    let release!: () => void, ready!: () => void;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const reached = new Promise<void>((resolve) => {
      ready = resolve;
    });
    let originalId = '',
      committed = false;
    jest.spyOn(writer, 'direct').mockImplementationOnce(async (...args) => {
      const result = await actual(...args);
      originalId = args[1].entryId;
      ready();
      await released;
      return result;
    });
    // The separately inserted legacy fixture does not participate in this new cooldown window.
    const original = repository
      .createDirect({ ...s.input, cooldownStartedAfter: s.entry.createdAt })
      .then((entry) => {
        committed = true;
        return entry;
      });
    const observedOriginal = Promise.allSettled([original]);
    await reached;
    const reversal = repository.reverse(
      originalId,
      s.moderatorId,
      s.recipientId,
      -1,
      'Synthetic concurrent reversal',
    );
    try {
      await expect(reversal).rejects.toMatchObject({ code: 'P2003' });
      expect(committed).toBe(false);
    } finally {
      release();
      await observedOriginal;
    }
    await expect(original).resolves.toMatchObject({ id: originalId });
    await expect(
      repository.reverse(
        originalId,
        s.moderatorId,
        s.recipientId,
        -1,
        'Synthetic committed reversal',
      ),
    ).resolves.not.toBeNull();
    expect(
      await fixture.prisma.reputationQualificationState.findUnique({
        where: { originalEntryId: originalId },
      }),
    ).toMatchObject({ status: 'WITHDRAWN' });
    expect(
      await fixture.prisma.reputationQualificationEvent.count({
        where: { entryId: originalId, provenance: 'VERIFIED_LEGACY' },
      }),
    ).toBe(0);
  });
});
