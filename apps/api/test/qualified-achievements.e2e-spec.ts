/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Qualified Achievements Tests
 * 📄 File: apps/api/test/qualified-achievements.e2e-spec.ts
 * 🎯 Purpose: Verifies owned qualification order through real migrated persistence.
 * 🧠 Responsibilities: Exercises withdrawal, legitimate successors, duplicate delivery and conflict rollback.
 * 🏗️ Architecture: Real owner assembly with synthetic attested facts; no producer/admission/queue activation.
 * ⚠️ Important: Explicit CONTINUE calls are protocol progress, not retries of failed assertions.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { INestApplication } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { IntegrationEventJob } from '@dss/jobs';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import { OutboxWriterService } from '../src/core/events';
import { QualifiedAchievementsService } from '../src/modules/achievements/application/services/qualified-achievements.service';
import { AchievementsService } from '../src/modules/achievements/application/services/achievements.service';
import {
  ACHIEVEMENTS_REPOSITORY,
  type AchievementsRepository,
} from '../src/modules/achievements/domain/repositories/achievements.repository.interface';
import {
  QUALIFIED_ACHIEVEMENTS_REPOSITORY,
  type QualifiedAchievementsRepository,
} from '../src/modules/achievements/domain/repositories/qualified-achievements.repository.interface';
import type {
  QualifiedAchievementCommand,
  QualifiedAchievementFact,
  QualifiedAchievementOutcome,
} from '../src/modules/achievements/domain/types/qualified-achievement.type';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Qualified achievement owner (e2e, inactive automatic runtime)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let service: QualifiedAchievementsService;
  let legacy: AchievementsService;
  let controls: Pool;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    await app.init();
    service = app.get(QualifiedAchievementsService);
    legacy = app.get(AchievementsService);
    controls = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      try {
        await controls?.end();
      } finally {
        await fixture?.close();
      }
    }
  });

  async function scenario(eventPrefix = 'synthetic.qualified') {
    const id = randomUUID();
    const eventName = `${eventPrefix}.${id.replaceAll('-', '')}.v1`;
    await fixture.prisma.user.create({
      data: {
        id,
        username: id,
        email: `${id}@dss.invalid`,
        passwordHash: 'synthetic-not-a-login',
      },
    });
    const definition = await fixture.prisma.achievementDefinition.create({
      data: {
        key: id,
        name: 'Qualified synthetic',
        slug: id,
        color: '#112233',
        badge: 'synthetic',
        createdById: id,
        updatedById: id,
      },
    });
    const rule = await fixture.prisma.achievementRule.create({
      data: {
        achievementId: definition.id,
        eventName,
        recipientPayloadKey: 'beneficiaryId',
        createdById: id,
        updatedById: id,
      },
    });
    const factId = randomUUID();
    const eventId = randomUUID();
    const original: QualifiedAchievementFact = {
      producer: 'synthetic.qualified',
      sourceKind: 'Synthetic',
      sourceId: randomUUID(),
      factId,
      canonicalEventId: eventId,
      revision: '1',
      action: 'QUALIFY',
      qualificationId: randomUUID(),
      qualificationRevision: '1',
      qualificationEventId: eventId,
      qualificationFactId: factId,
      retiredThroughRevision: '0',
      predecessorWithdrawalFactId: null,
      contractVersion: 1,
    };
    const withdrawal: QualifiedAchievementFact = {
      ...original,
      factId: randomUUID(),
      canonicalEventId: randomUUID(),
      revision: '2',
      action: 'WITHDRAW',
      retiredThroughRevision: '1',
    };
    const nextFactId = randomUUID();
    const nextEventId = randomUUID();
    const successor: QualifiedAchievementFact = {
      ...original,
      factId: nextFactId,
      canonicalEventId: nextEventId,
      revision: '3',
      qualificationId: randomUUID(),
      qualificationRevision: '3',
      qualificationFactId: nextFactId,
      qualificationEventId: nextEventId,
      retiredThroughRevision: '2',
      predecessorWithdrawalFactId: withdrawal.factId,
    };
    function command(
      fact: QualifiedAchievementFact,
    ): QualifiedAchievementCommand {
      return {
        event: {
          eventId: fact.canonicalEventId,
          eventName:
            fact.action === 'QUALIFY'
              ? eventName
              : `synthetic.withdrawn.${id.replaceAll('-', '')}.v1`,
          eventVersion: 1,
          producer: fact.producer,
          sourceType: fact.sourceKind,
          sourceId: fact.sourceId,
          occurredAt: '2026-11-08T12:00:00.000Z',
          payload: { beneficiaryId: id },
        },
        facts: [fact],
        contribution:
          fact.action === 'QUALIFY'
            ? { producer: fact.producer, factId: fact.factId }
            : null,
      };
    }
    return { id, definition, rule, original, withdrawal, successor, command };
  }

  async function drain(
    command: QualifiedAchievementCommand,
  ): Promise<QualifiedAchievementOutcome> {
    for (let step = 0; step < 12; step++) {
      const result = await service.advance(command);
      if (result.status !== 'CONTINUE') return result;
      expect(result.examined).toBeLessThanOrEqual(64);
    }
    throw new Error(
      'Synthetic qualification did not finish within its expected finite work.',
    );
  }

  function legacyJob(
    command: QualifiedAchievementCommand,
  ): IntegrationEventJob {
    return {
      eventId: command.event.eventId,
      eventName: command.event.eventName,
      eventVersion: command.event.eventVersion,
      producer: command.event.producer,
      category: 'integration',
      aggregateType: command.event.sourceType ?? undefined,
      aggregateId: command.event.sourceId ?? undefined,
      occurredAt: command.event.occurredAt,
      payload: { ...command.event.payload },
    };
  }

  async function waitForBlockedOwner(blockerPid: number): Promise<void> {
    const deadline = performance.now() + 2000;
    while (performance.now() < deadline) {
      const result = await controls.query<{ waiting: boolean }>(
        `SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND state='active'
          AND $1::int=ANY(pg_blocking_pids(pid))
      ) AS waiting`,
        [blockerPid],
      );
      if (result.rows[0].waiting) return;
    }
    throw new Error('Expected a real blocked owner transaction.');
  }

  it('records an absent withdrawal so the late original cannot award', async () => {
    const s = await scenario();
    await expect(drain(s.command(s.withdrawal))).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [],
    });
    await expect(drain(s.command(s.original))).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'IGNORED' }],
    });
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: s.definition.id },
      }),
    ).toBe(0);
    const cursor =
      await fixture.prisma.achievementSourceCursor.findFirstOrThrow({
        where: { sourceId: s.original.sourceId },
      });
    expect(cursor).toMatchObject({
      appliedRevision: 2n,
      targetRevision: 2n,
      phase: 'STABLE',
    });
  });

  it('preserves the existing valid event-name grammar, including a numeric first segment', async () => {
    const s = await scenario('123.qualified');
    await expect(drain(s.command(s.original))).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'AWARDED' }],
    });
  });

  it('retires the predecessor before successor eligibility and ignores the late old withdrawal', async () => {
    const s = await scenario();
    await expect(drain(s.command(s.original))).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'AWARDED' }],
    });
    const firstStep = await service.advance(s.command(s.successor));
    expect(firstStep).toMatchObject({ status: 'CONTINUE', examined: 1 });
    const awardsBeforeFinalize = await fixture.prisma.achievementAward.findMany(
      {
        where: { achievementId: s.definition.id },
        include: { revocation: true },
      },
    );
    expect(awardsBeforeFinalize).toHaveLength(1);
    expect(awardsBeforeFinalize[0].revocation).not.toBeNull();
    await expect(drain(s.command(s.successor))).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'AWARDED' }],
    });
    await expect(drain(s.command(s.withdrawal))).resolves.toMatchObject({
      status: 'COMPLETE',
    });
    const active = await fixture.prisma.achievementAward.findMany({
      where: { achievementId: s.definition.id, revocation: null },
    });
    expect(active).toHaveLength(1);
    expect(active[0].sourceEventId).toBe(s.successor.canonicalEventId);
  });

  it('deduplicates concurrent qualified originals without a second binding or effect', async () => {
    const s = await scenario();
    const results = await Promise.all([
      service.advance(s.command(s.original)),
      service.advance(s.command(s.original)),
    ]);
    expect(results.every((result) => result.status === 'COMPLETE')).toBe(true);
    expect(
      results
        .flatMap((result) =>
          result.status === 'COMPLETE'
            ? result.consumptions.map((entry) => entry.status)
            : [],
        )
        .sort(),
    ).toEqual(['AWARDED', 'DUPLICATE']);
    const grants = await fixture.prisma.achievementAward.findMany({
      where: { achievementId: s.definition.id },
      include: { qualification: true },
    });
    expect(grants).toHaveLength(1);
    expect(grants[0].qualification?.sourceEventId).toBe(
      s.original.canonicalEventId,
    );
  });

  it('rejects conflicting revision reuse before another grant or target change', async () => {
    const s = await scenario();
    await drain(s.command(s.original));
    const before =
      await fixture.prisma.achievementSourceCursor.findFirstOrThrow({
        where: { sourceId: s.original.sourceId },
      });
    const conflicting = { ...s.original, qualificationId: randomUUID() };
    await expect(service.advance(s.command(conflicting))).resolves.toEqual({
      status: 'BLOCKED',
      code: 'FACT_CONFLICT',
      examined: 0,
    });
    expect(
      await fixture.prisma.achievementSourceCursor.findUniqueOrThrow({
        where: { id: before.id },
      }),
    ).toEqual(before);
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: s.definition.id },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.achievementSourceFact.count({
        where: { cursorId: before.id },
      }),
    ).toBe(1);
  });

  it('rejects imprecise or aliased revisions before source persistence', async () => {
    const s = await scenario();
    for (const revision of ['01', '0', '-1', '1.5', '9223372036854775808']) {
      const input = s.command({ ...s.original, revision });
      await expect(service.advance(input)).resolves.toEqual({
        status: 'BLOCKED',
        code: 'INVALID_QUALIFICATION',
        examined: 0,
      });
    }
    expect(
      await fixture.prisma.achievementSourceCursor.count({
        where: { sourceId: s.original.sourceId },
      }),
    ).toBe(0);
  });

  it('routes an enrolled legacy event using its sealed facts rather than the caller payload', async () => {
    const s = await scenario();
    const command = s.command(s.original);
    await fixture.prisma.achievementRule.update({
      where: { id: s.rule.id },
      data: { enabled: false },
    });
    await expect(drain(command)).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [],
    });
    const otherId = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id: otherId,
        username: otherId,
        email: `${otherId}@dss.invalid`,
        passwordHash: 'synthetic-not-a-login',
      },
    });
    await fixture.prisma.achievementRule.update({
      where: { id: s.rule.id },
      data: { enabled: true },
    });
    await expect(
      legacy.consume({
        ...legacyJob(command),
        payload: { beneficiaryId: otherId, privateBody: 'not a sealed fact' },
      }),
    ).resolves.toMatchObject([{ status: 'AWARDED', award: { userId: s.id } }]);
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: s.definition.id, userId: otherId },
      }),
    ).toBe(0);
    const fact = await fixture.prisma.achievementSourceFact.findFirstOrThrow({
      where: { producerFactId: s.original.factId },
    });
    expect(JSON.stringify(fact.eventProjection)).not.toContain('privateBody');
  });

  it('blocks an unknown legacy event on an enrolled source before economic writes', async () => {
    const s = await scenario();
    await drain(s.command(s.withdrawal));
    await expect(
      legacy.consume(legacyJob(s.command(s.original))),
    ).rejects.toMatchObject({ code: 'LEGACY_FACT_REQUIRED' });
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: s.definition.id },
      }),
    ).toBe(0);
  });

  it('keeps a late mapped legacy withdrawal from invoking broad rollback on the successor', async () => {
    const s = await scenario();
    await drain(s.command(s.original));
    await drain(s.command(s.successor));
    await drain(s.command(s.withdrawal));
    await expect(
      legacy.consume({
        ...legacyJob(s.command(s.withdrawal)),
        payload: {
          reversedSourceType: s.original.sourceKind,
          reversedSourceId: s.original.sourceId,
        },
      }),
    ).resolves.toEqual([]);
    const active = await fixture.prisma.achievementAward.findMany({
      where: { achievementId: s.definition.id, revocation: null },
    });
    expect(active).toHaveLength(1);
    expect(active[0].sourceEventId).toBe(s.successor.canonicalEventId);
  });

  it('rechecks enrolment after the legacy routing lookup and before its grant transaction', async () => {
    const s = await scenario();
    const repository = app.get<AchievementsRepository>(ACHIEVEMENTS_REPOSITORY);
    const consume = repository.consume.bind(
      repository,
    ) as AchievementsRepository['consume'];
    let signalReached!: () => void;
    let release!: () => void;
    const reached = new Promise<void>((resolve) => {
      signalReached = resolve;
    });
    const resume = new Promise<void>((resolve) => {
      release = resolve;
    });
    jest
      .spyOn(repository, 'consume')
      .mockImplementationOnce(async (...args) => {
        signalReached();
        await resume;
        return consume(...args);
      });
    const pending = legacy.consume(legacyJob(s.command(s.original)));
    const outcome = pending.then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await Promise.race([
        reached,
        outcome.then(() => {
          throw new Error(
            'Legacy request finished before its scheduled boundary.',
          );
        }),
      ]);
      await expect(
        service.advance(s.command(s.original)),
      ).resolves.toMatchObject({ status: 'COMPLETE' });
    } finally {
      release();
      await outcome;
    }
    await expect(outcome).resolves.toMatchObject({
      error: { code: 'LEGACY_FACT_REQUIRED' },
    });
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: s.definition.id },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.achievementAwardQualification.count({
        where: { sourceEventId: s.original.canonicalEventId },
      }),
    ).toBe(1);
  });

  it('blocks ambiguous pre-existing grants until their exact reviewed mapping is supplied', async () => {
    const s = await scenario();
    const [legacyGrant] = await legacy.consume(
      legacyJob(s.command(s.original)),
    );
    expect(legacyGrant.status).toBe('AWARDED');
    const grant = legacyGrant.award;
    if (!grant) throw new Error('Expected the real legacy grant.');
    await expect(
      service.advance(s.command(s.withdrawal)),
    ).resolves.toMatchObject({
      status: 'BLOCKED',
      code: 'BLOCKED_LEGACY_MAPPING',
    });
    expect(
      await fixture.prisma.achievementAwardRevocation.findUnique({
        where: { awardId: grant.id },
      }),
    ).toBeNull();
    const mapped: QualifiedAchievementCommand = {
      ...s.command(s.withdrawal),
      facts: [s.original, s.withdrawal],
      mappings: [
        {
          awardId: grant.id,
          qualification: {
            producer: s.original.producer,
            factId: s.original.factId,
          },
          evidenceId: 'synthetic-reviewed-manifest',
          evidenceDigest: '1'.repeat(64),
        },
      ],
    };
    await expect(service.advance(mapped)).resolves.toMatchObject({
      status: 'CONTINUE',
      examined: 1,
    });
    await expect(
      legacy.consume(legacyJob(s.command(s.withdrawal))),
    ).rejects.toMatchObject({
      name: 'QualificationContinuationRequiredError',
    });
    await expect(drain(mapped)).resolves.toMatchObject({ status: 'COMPLETE' });
    expect(
      await fixture.prisma.achievementAwardRevocation.count({
        where: { awardId: grant.id },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: s.definition.id },
      }),
    ).toBe(1);
    await expect(
      legacy.consume(legacyJob(s.command(s.original))),
    ).rejects.toMatchObject({ code: 'LEGACY_FACT_REQUIRED' });
    await expect(drain(s.command(s.original))).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'DUPLICATE' }],
    });
  });

  it('preserves manual awards through source qualification and withdrawal', async () => {
    const s = await scenario();
    const manual = await legacy.manualAward(
      s.id,
      s.definition.id,
      'Synthetic manual recognition',
      s.id,
    );
    await expect(drain(s.command(s.original))).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'IGNORED' }],
    });
    await drain(s.command(s.withdrawal));
    expect(
      await fixture.prisma.achievementAwardRevocation.findUnique({
        where: { awardId: manual.id },
      }),
    ).toBeNull();
    expect(
      await fixture.prisma.achievementAwardQualification.findUnique({
        where: { awardId: manual.id },
      }),
    ).toBeNull();
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: s.definition.id },
      }),
    ).toBe(1);
  });

  it('retires a reviewed late binding even after an empty prefix became stable', async () => {
    const s = await scenario();
    await drain(s.command(s.withdrawal));
    const before =
      await fixture.prisma.achievementSourceCursor.findFirstOrThrow({
        where: { sourceId: s.original.sourceId },
      });
    expect(before).toMatchObject({
      phase: 'STABLE',
      retirementAfterRevision: null,
    });
    // Synthetic import preparation only: no live writer may bypass enrolment guards.
    const grant = await fixture.prisma.achievementAward.create({
      data: {
        userId: s.id,
        achievementId: s.definition.id,
        ruleId: s.rule.id,
        kind: 'RULE',
        reason: 'Synthetic reviewed late import',
        sourceEventId: s.original.canonicalEventId,
        sourceEventName: s.rule.eventName,
        sourceType: s.original.sourceKind,
        sourceId: s.original.sourceId,
      },
    });
    const mapped: QualifiedAchievementCommand = {
      ...s.command(s.withdrawal),
      facts: [s.original, s.withdrawal],
      mappings: [
        {
          awardId: grant.id,
          qualification: {
            producer: s.original.producer,
            factId: s.original.factId,
          },
          evidenceId: 'synthetic-late-import-review',
          evidenceDigest: '2'.repeat(64),
        },
      ],
    };
    await expect(service.advance(mapped)).resolves.toMatchObject({
      status: 'CONTINUE',
      examined: 1,
    });
    expect(
      await fixture.prisma.achievementSourceCursor.findUniqueOrThrow({
        where: { id: before.id },
      }),
    ).toMatchObject({ phase: 'RETIRING', generation: before.generation + 1n });
    await expect(drain(mapped)).resolves.toMatchObject({ status: 'COMPLETE' });
    expect(
      await fixture.prisma.achievementAwardRevocation.count({
        where: { awardId: grant.id },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.auditRecord.count({
        where: { targetId: grant.id, action: 'achievements.award.revoked' },
      }),
    ).toBe(1);
  });

  it.each([
    {
      policy: 'nonrepeatable',
      repeatable: false,
      cooldownHours: 0,
      dailyCap: null,
      expected: 'IGNORED',
    },
    {
      policy: 'repeatable',
      repeatable: true,
      cooldownHours: 0,
      dailyCap: null,
      expected: 'AWARDED',
    },
    {
      policy: 'cooldown',
      repeatable: true,
      cooldownHours: 24,
      dailyCap: null,
      expected: 'CAPPED',
    },
    {
      policy: 'daily cap',
      repeatable: true,
      cooldownHours: 0,
      dailyCap: 1,
      expected: 'CAPPED',
    },
  ])(
    'preserves $policy across independent qualified sources',
    async ({ repeatable, cooldownHours, dailyCap, expected }) => {
      const s = await scenario();
      await fixture.prisma.achievementRule.update({
        where: { id: s.rule.id },
        data: { repeatable, cooldownHours, dailyCap },
      });
      await drain(s.command(s.original));
      const eventId = randomUUID();
      const factId = randomUUID();
      const other = {
        ...s.original,
        sourceId: randomUUID(),
        factId,
        canonicalEventId: eventId,
        qualificationId: randomUUID(),
        qualificationFactId: factId,
        qualificationEventId: eventId,
      };
      await expect(drain(s.command(other))).resolves.toMatchObject({
        status: 'COMPLETE',
        consumptions: [{ status: expected }],
      });
      await expect(drain(s.command(other))).resolves.toMatchObject({
        status: 'COMPLETE',
        consumptions: [{ status: 'DUPLICATE' }],
      });
      await drain(s.command(s.withdrawal));
      const remaining = await fixture.prisma.achievementAward.findMany({
        where: { achievementId: s.definition.id, revocation: null },
      });
      expect(remaining.map((grant) => grant.sourceEventId)).toEqual(
        expected === 'AWARDED' ? [eventId] : [],
      );
    },
  );

  it.each([false, true])(
    'guards event-identity qualifications with an aggregate present: %s',
    async (aggregate) => {
      const s = await scenario();
      const original = {
        ...s.original,
        sourceKind: '@event',
        sourceId: s.original.canonicalEventId,
      };
      const withdrawal = {
        ...s.withdrawal,
        sourceKind: original.sourceKind,
        sourceId: original.sourceId,
      };
      const command = (
        fact: QualifiedAchievementFact,
      ): QualifiedAchievementCommand => ({
        ...s.command(fact),
        event: {
          ...s.command(fact).event,
          sourceType: aggregate ? 'SyntheticAggregate' : null,
          sourceId: aggregate ? s.original.sourceId : null,
        },
      });
      await drain(command(withdrawal));
      await expect(
        legacy.consume(legacyJob(command(original))),
      ).rejects.toMatchObject({ code: 'LEGACY_FACT_REQUIRED' });
      await expect(drain(command(original))).resolves.toMatchObject({
        status: 'COMPLETE',
        consumptions: [{ status: 'IGNORED' }],
      });
      expect(
        await fixture.prisma.achievementAward.count({
          where: { achievementId: s.definition.id },
        }),
      ).toBe(0);
    },
  );

  it('rejects changing a sealed contribution pointer without changing prior evidence', async () => {
    const s = await scenario();
    const command = s.command(s.original);
    await drain(command);
    await fixture.prisma.achievementRule.update({
      where: { id: s.rule.id },
      data: { enabled: false },
    });
    await expect(
      service.advance({ ...command, contribution: null }),
    ).resolves.toMatchObject({ status: 'BLOCKED', code: 'FACT_CONFLICT' });
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: s.definition.id },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.achievementAwardRevocation.count({
        where: { award: { achievementId: s.definition.id } },
      }),
    ).toBe(0);
  });

  it('preserves administrative rollback while rejecting unversioned rollback of event-bound grants', async () => {
    const s = await scenario();
    const original = {
      ...s.original,
      sourceKind: '@event',
      sourceId: s.original.canonicalEventId,
    };
    const command = {
      ...s.command(original),
      event: {
        ...s.command(original).event,
        sourceType: 'SyntheticAggregate',
        sourceId: s.original.sourceId,
      },
    };
    await drain(command);
    const repository = app.get<AchievementsRepository>(ACHIEVEMENTS_REPOSITORY);
    await expect(
      repository.rollbackSource(
        'SyntheticAggregate',
        s.original.sourceId,
        'Synthetic unversioned event',
        null,
        'LEGACY_EVENT',
      ),
    ).rejects.toMatchObject({ code: 'LEGACY_FACT_REQUIRED' });
    expect(
      await fixture.prisma.achievementAwardRevocation.count({
        where: { award: { achievementId: s.definition.id } },
      }),
    ).toBe(0);
    const revoked = await legacy.rollbackSource(
      'SyntheticAggregate',
      s.original.sourceId,
      'Synthetic explicit administrator decision',
      s.id,
    );
    expect(revoked).toHaveLength(1);
    expect(revoked[0].sourceEventId).toBe(original.canonicalEventId);
    await expect(
      legacy.rollbackSource(
        'SyntheticAggregate',
        s.original.sourceId,
        'Synthetic duplicate administrator decision',
        s.id,
      ),
    ).resolves.toEqual([]);
    expect(
      await fixture.prisma.achievementAwardRevocation.count({
        where: { awardId: revoked[0].id },
      }),
    ).toBe(1);
  });

  it('does not merge equal source identifiers belonging to different producers', async () => {
    const a = await scenario();
    const b = await scenario();
    const bFact = {
      ...b.original,
      producer: 'synthetic.other-producer',
      sourceId: a.original.sourceId,
    };
    await drain(b.command(bFact));
    await drain(a.command(a.original));
    await drain(a.command(a.withdrawal));
    const bGrants = await fixture.prisma.achievementAward.findMany({
      where: { achievementId: b.definition.id, revocation: null },
    });
    expect(bGrants).toHaveLength(1);
    expect(
      await fixture.prisma.achievementSourceCursor.count({
        where: {
          sourceKind: a.original.sourceKind,
          sourceId: a.original.sourceId,
        },
      }),
    ).toBe(2);
  });

  it('keeps the retirement frontier and revocation atomic when evidence fails', async () => {
    const s = await scenario();
    await drain(s.command(s.original));
    const outbox = app.get(OutboxWriterService);
    const failure = new Error('synthetic retirement Outbox failure');
    const append = jest.spyOn(outbox, 'append').mockRejectedValueOnce(failure);
    await expect(service.advance(s.command(s.successor))).rejects.toBe(failure);
    const beforeRetry =
      await fixture.prisma.achievementSourceCursor.findFirstOrThrow({
        where: { sourceId: s.original.sourceId },
      });
    expect(beforeRetry).toMatchObject({
      phase: 'RETIRING',
      appliedRevision: 1n,
      targetRevision: 3n,
      retirementAfterRevision: null,
    });
    const active = await fixture.prisma.achievementAward.findMany({
      where: { achievementId: s.definition.id, revocation: null },
    });
    expect(active).toHaveLength(1);
    append.mockRestore();
    await expect(drain(s.command(s.successor))).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'AWARDED' }],
    });
    expect(
      await fixture.prisma.achievementAwardRevocation.count({
        where: { award: { achievementId: s.definition.id } },
      }),
    ).toBe(1);
  });

  it('uses the newest target when a withdrawal supersedes an unfinished successor', async () => {
    const s = await scenario();
    await drain(s.command(s.original));
    await expect(
      service.advance(s.command(s.successor)),
    ).resolves.toMatchObject({ status: 'CONTINUE' });
    const latest: QualifiedAchievementFact = {
      ...s.successor,
      action: 'WITHDRAW',
      factId: randomUUID(),
      canonicalEventId: randomUUID(),
      revision: '4',
      retiredThroughRevision: '3',
      predecessorWithdrawalFactId: null,
    };
    await drain(s.command(latest));
    await expect(drain(s.command(s.successor))).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'IGNORED' }],
    });
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: s.definition.id, revocation: null },
      }),
    ).toBe(0);
    expect(
      await fixture.prisma.achievementSourceCursor.findFirstOrThrow({
        where: { sourceId: s.original.sourceId },
      }),
    ).toMatchObject({
      phase: 'STABLE',
      appliedRevision: 4n,
      targetRevision: 4n,
    });
  });

  it('rejects qualification identity reuse in a later cycle without changing the stable target', async () => {
    const s = await scenario();
    await drain(s.command(s.original));
    const before =
      await fixture.prisma.achievementSourceCursor.findFirstOrThrow({
        where: { sourceId: s.original.sourceId },
      });
    const reused = {
      ...s.successor,
      qualificationId: s.original.qualificationId,
    };
    await expect(service.advance(s.command(reused))).resolves.toMatchObject({
      status: 'BLOCKED',
      code: 'FACT_CONFLICT',
    });
    expect(
      await fixture.prisma.achievementSourceCursor.findUniqueOrThrow({
        where: { id: before.id },
      }),
    ).toEqual(before);
    expect(
      await fixture.prisma.achievementSourceFact.count({
        where: { cursorId: before.id },
      }),
    ).toBe(1);
  });

  it('reconciles withdrawal and its independently rewardable event contribution without a legacy early return', async () => {
    const s = await scenario();
    await drain(s.command(s.original));
    const definitionId = randomUUID();
    const definition = await fixture.prisma.achievementDefinition.create({
      data: {
        id: definitionId,
        key: definitionId,
        slug: definitionId,
        name: 'Synthetic decision reward',
        color: '#112233',
        badge: 'synthetic',
        createdById: s.id,
        updatedById: s.id,
      },
    });
    const control = s.command(s.withdrawal);
    const rule = await fixture.prisma.achievementRule.create({
      data: {
        achievementId: definition.id,
        eventName: control.event.eventName,
        recipientPayloadKey: 'beneficiaryId',
        createdById: s.id,
        updatedById: s.id,
      },
    });
    const factId = randomUUID();
    const reward: QualifiedAchievementFact = {
      ...s.original,
      sourceKind: '@event',
      sourceId: control.event.eventId,
      factId,
      canonicalEventId: control.event.eventId,
      qualificationId: randomUUID(),
      qualificationEventId: control.event.eventId,
      qualificationFactId: factId,
    };
    const command: QualifiedAchievementCommand = {
      ...control,
      facts: [s.withdrawal, reward],
      contribution: { producer: reward.producer, factId: reward.factId },
    };
    await expect(drain(command)).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ ruleId: rule.id, status: 'AWARDED' }],
    });
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: s.definition.id, revocation: null },
      }),
    ).toBe(0);
    await drain(s.command(s.successor));
    await expect(
      legacy.consume({
        ...legacyJob(command),
        payload: {
          reversedSourceType: s.original.sourceKind,
          reversedSourceId: s.original.sourceId,
        },
      }),
    ).resolves.toMatchObject([{ ruleId: rule.id, status: 'DUPLICATE' }]);
    expect(
      await fixture.prisma.achievementAward.count({
        where: {
          achievementId: { in: [s.definition.id, definition.id] },
          revocation: null,
        },
      }),
    ).toBe(2);
  });

  it('rechecks qualification between committed rules and cannot award the remaining old-cycle rule', async () => {
    const s = await scenario();
    const definitionId = randomUUID();
    const secondDefinition = await fixture.prisma.achievementDefinition.create({
      data: {
        id: definitionId,
        key: definitionId,
        slug: definitionId,
        name: 'Synthetic second rule',
        color: '#112233',
        badge: 'synthetic',
        createdById: s.id,
        updatedById: s.id,
      },
    });
    const second = await fixture.prisma.achievementRule.create({
      data: {
        id: `zz-${randomUUID()}`,
        achievementId: secondDefinition.id,
        eventName: s.rule.eventName,
        recipientPayloadKey: s.rule.recipientPayloadKey,
        createdById: s.id,
        updatedById: s.id,
      },
    });
    const repository = app.get<QualifiedAchievementsRepository>(
      QUALIFIED_ACHIEVEMENTS_REPOSITORY,
    );
    const consume = repository.consumeRule.bind(
      repository,
    ) as QualifiedAchievementsRepository['consumeRule'];
    let signal!: () => void;
    let release!: () => void;
    const reached = new Promise<void>((resolve) => {
      signal = resolve;
    });
    const resume = new Promise<void>((resolve) => {
      release = resolve;
    });
    jest
      .spyOn(repository, 'consumeRule')
      .mockImplementationOnce(async (...args) => {
        const result = await consume(...args);
        signal();
        await resume;
        return result;
      });
    const pending = service.advance(s.command(s.original));
    const outcome = pending.then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    try {
      await Promise.race([
        reached,
        outcome.then(() => {
          throw new Error(
            'Qualified request missed its committed-rule boundary.',
          );
        }),
      ]);
      await expect(drain(s.command(s.withdrawal))).resolves.toMatchObject({
        status: 'COMPLETE',
      });
    } finally {
      release();
      await outcome;
    }
    await expect(outcome).resolves.toMatchObject({
      value: {
        status: 'COMPLETE',
        consumptions: [
          { ruleId: s.rule.id, status: 'AWARDED' },
          { ruleId: second.id, status: 'IGNORED' },
        ],
      },
    });
    expect(
      await fixture.prisma.achievementAward.count({
        where: {
          achievementId: { in: [s.definition.id, secondDefinition.id] },
          revocation: null,
        },
      }),
    ).toBe(0);
    expect(
      await fixture.prisma.achievementAward.count({
        where: { achievementId: secondDefinition.id },
      }),
    ).toBe(0);
    await expect(drain(s.command(s.original))).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'DUPLICATE' }, { status: 'DUPLICATE' }],
    });
  });

  it.each(['RETIRE_FIRST', 'ADMIN_FIRST'] as const)(
    'serializes actual revoke and retirement transactions: %s',
    async (order) => {
      const s = await scenario();
      await drain(s.command(s.original));
      const grant = await fixture.prisma.achievementAward.findFirstOrThrow({
        where: { achievementId: s.definition.id },
      });
      const outbox = app.get(OutboxWriterService);
      const append = outbox.append.bind(
        outbox,
      ) as OutboxWriterService['append'];
      let signal!: (pid: number) => void;
      let release!: () => void;
      const reached = new Promise<number>((resolve) => {
        signal = resolve;
      });
      const resume = new Promise<void>((resolve) => {
        release = resolve;
      });
      let held = false;
      jest
        .spyOn(outbox, 'append')
        .mockImplementation(async (transaction, event) => {
          const result = await append(transaction, event);
          if (
            !held &&
            event.name === 'achievements.award.revoked.v1' &&
            event.aggregate?.id === grant.id
          ) {
            held = true;
            const [backend] = await transaction.$queryRaw<
              { pid: number }[]
            >`SELECT pg_backend_pid() AS pid`;
            signal(backend.pid);
            await resume;
          }
          return result;
        });
      const admin = () =>
        legacy.revoke(grant.id, 'Synthetic moderator decision', s.id);
      const retirement = () => service.advance(s.command(s.successor));
      const first = (order === 'RETIRE_FIRST' ? retirement() : admin()).then(
        (value: unknown) => ({ value }),
        (error: unknown) => ({ error }),
      );
      let second: Promise<unknown> = Promise.resolve();
      try {
        const pid = await Promise.race([
          reached,
          first.then((): never => {
            throw new Error(
              'Expected the first actual revocation transaction to be held.',
            );
          }),
        ]);
        second = (order === 'RETIRE_FIRST' ? admin() : retirement()).then(
          (value: unknown) => ({ value }),
          (error: unknown) => ({ error }),
        );
        await waitForBlockedOwner(pid);
      } finally {
        release();
        await Promise.all([first, second]);
      }
      const firstResult = await first;
      const secondResult = await second;
      if (order === 'RETIRE_FIRST') {
        expect(firstResult).toMatchObject({
          value: { status: 'CONTINUE', examined: 1 },
        });
        if (
          typeof secondResult !== 'object' ||
          secondResult === null ||
          !('error' in secondResult)
        )
          throw new Error(
            'Expected the already-revoked administration failure.',
          );
        expect(secondResult.error).toBeInstanceOf(ConflictException);
      } else {
        expect(firstResult).toMatchObject({
          value: { id: grant.id, revocation: { awardId: grant.id } },
        });
        expect(secondResult).toMatchObject({
          value: { status: 'CONTINUE', examined: 1 },
        });
      }
      expect(
        await fixture.prisma.achievementAwardRevocation.count({
          where: { awardId: grant.id },
        }),
      ).toBe(1);
      expect(
        await fixture.prisma.auditRecord.count({
          where: { targetId: grant.id, action: 'achievements.award.revoked' },
        }),
      ).toBe(1);
      await expect(drain(s.command(s.successor))).resolves.toMatchObject({
        status: 'COMPLETE',
        consumptions: [{ status: 'AWARDED' }],
      });
    },
  );

  it('retains lifecycle revisions above the JavaScript exact-integer range', async () => {
    const s = await scenario();
    const large = {
      ...s.original,
      revision: '9007199254740993',
      qualificationRevision: '9007199254740993',
    };
    await expect(drain(s.command(large))).resolves.toMatchObject({
      status: 'COMPLETE',
      consumptions: [{ status: 'AWARDED' }],
    });
    expect(
      await fixture.prisma.achievementSourceCursor.findFirstOrThrow({
        where: { sourceId: s.original.sourceId },
      }),
    ).toMatchObject({
      targetRevision: 9007199254740993n,
      appliedRevision: 9007199254740993n,
    });
  });
});
