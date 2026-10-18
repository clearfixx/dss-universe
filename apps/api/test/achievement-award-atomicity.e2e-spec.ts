/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Achievements Audit
 * 📄 File: apps/api/test/achievement-award-atomicity.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies owned automatic award cap and transactional evidence on migrated PostgreSQL.
 *
 * 🧠 Responsibilities:
 * • runs distinct event calls against a shared one-award quota;
 * • verifies exact award/processed/Audit/Outbox evidence;
 * • proves failed Outbox append rolls back the award and marker.
 *
 * 🏗️ Architecture:
 * Test-only isolated schema and real owner repository; manual command is unused.
 *
 * ⚠️ Important:
 * Concurrent calls alone do not prove every adversarial interleaving.
 * Only a failing Outbox boundary is injected; no successful DB results mocked.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import type { TransactionClient } from '../src/core/database';
import { AuditWriterService } from '../src/core/audit/services/audit-writer.service';
import { AuditRedactionService } from '../src/core/audit/services/audit-redaction.service';
import { OutboxWriterService } from '../src/core/events/services/outbox-writer.service';
import { PrismaAchievementsRepository } from '../src/modules/achievements/infrastructure/repositories/prisma-achievements.repository';
import type {
  AchievementEvent,
  AchievementRule,
} from '../src/modules/achievements/domain/types/achievements.type';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Achievement award atomicity (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let repository: PrismaAchievementsRepository;
  let outbox: OutboxWriterService;
  let userId: string;
  let rule: AchievementRule;
  beforeEach(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    userId = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id: userId,
        username: userId,
        email: `${userId}@dss.test`,
        passwordHash: 'synthetic-not-delivered',
      },
    });
    const definition = await fixture.prisma.achievementDefinition.create({
      data: {
        key: userId,
        name: userId,
        slug: userId,
        color: '#000000',
        badge: 'test',
        createdById: userId,
        updatedById: userId,
      },
    });
    const record = await fixture.prisma.achievementRule.create({
      data: {
        achievementId: definition.id,
        eventName: 'audit.achievement.v1',
        recipientPayloadKey: 'userId',
        repeatable: true,
        cooldownHours: 0,
        dailyCap: 1,
        createdById: userId,
        updatedById: userId,
      },
      include: { achievement: true },
    });
    rule = record;
    outbox = new OutboxWriterService();
    repository = new PrismaAchievementsRepository(
      fixture.prisma,
      new AuditWriterService(new AuditRedactionService()),
      outbox,
      {
        award() {
          throw new Error('Manual path must not be called');
        },
      },
    );
  }, 60000);
  afterEach(async () => {
    jest.restoreAllMocks();
    await fixture?.close();
  });
  function event(): AchievementEvent {
    return {
      eventId: randomUUID(),
      eventName: rule.eventName,
      eventVersion: 1,
      payload: { userId },
      sourceType: 'SyntheticActivity',
      sourceId: randomUUID(),
      occurredAt: new Date('2026-10-18T12:00:00Z'),
    };
  }
  async function evidence() {
    return Promise.all([
      fixture.prisma.achievementAward.count(),
      fixture.prisma.processedEvent.count(),
      fixture.prisma.auditRecord.count({
        where: { action: 'achievements.award.awarded' },
      }),
      fixture.prisma.outboxEvent.count({
        where: { producer: 'dss.api.achievements' },
      }),
    ]);
  }
  it('caps concurrent distinct events and retains markers for both', async () => {
    const first = event();
    const results = await Promise.all([
      repository.consume(rule, first, userId),
      repository.consume(rule, event(), userId),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual([
      'AWARDED',
      'CAPPED',
    ]);
    expect(await evidence()).toEqual([1, 2, 1, 1]);
    expect((await repository.consume(rule, first, userId)).status).toBe(
      'DUPLICATE',
    );
    expect(await evidence()).toEqual([1, 2, 1, 1]);
  });
  it('rolls back award, marker and Audit on Outbox failure and permits retry', async () => {
    const first = event();
    const failure = jest
      .spyOn(outbox, 'append')
      .mockRejectedValueOnce(new Error('synthetic outbox failure'));
    await expect(repository.consume(rule, first, userId)).rejects.toThrow(
      'synthetic outbox failure',
    );
    failure.mockRestore();
    expect(await evidence()).toEqual([0, 0, 0, 0]);
    expect((await repository.consume(rule, first, userId)).status).toBe(
      'AWARDED',
    );
    expect(await evidence()).toEqual([1, 1, 1, 1]);
  });
  it('observes the second transaction waiting before its real quota read', async () => {
    const counted = repository as unknown as {
      dailyCount(
        transaction: TransactionClient,
        ruleId: string,
        subjectId: string,
        at: Date,
      ): Promise<number>;
    };
    const original = counted.dailyCount.bind(
      repository,
    ) as typeof counted.dailyCount;
    const observed: number[] = [];
    let holderPid = 0;
    let firstReady!: () => void;
    const ready = new Promise<void>((resolve) => {
      firstReady = resolve;
    });
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const deadline = setTimeout(() => {
      release();
      firstReady();
    }, 1500);
    const spy = jest
      .spyOn(counted, 'dailyCount')
      .mockImplementation(async (...args) => {
        const count = await original(...args);
        observed.push(count);
        if (observed.length === 1) {
          const rows = await args[0].$queryRaw<
            { pid: number }[]
          >`SELECT pg_backend_pid() AS pid`;
          holderPid = rows[0].pid;
          firstReady();
          await barrier;
        }
        return count;
      });
    const first = repository.consume(rule, event(), userId);
    let second: ReturnType<typeof repository.consume> | undefined;
    try {
      await ready;
      expect(holderPid).toBeGreaterThan(0);
      second = repository.consume(rule, event(), userId);
      let waiting = false;
      const until = Date.now() + 1000;
      while (Date.now() < until) {
        const rows = await fixture.prisma.$queryRaw<{ waiting: boolean }[]>`
          SELECT EXISTS (
            SELECT 1 FROM pg_locks waiter JOIN pg_locks holder
            ON holder.locktype = waiter.locktype
            AND holder.database IS NOT DISTINCT FROM waiter.database
            AND holder.classid = waiter.classid AND holder.objid = waiter.objid
            AND holder.objsubid = waiter.objsubid
            WHERE waiter.locktype = 'advisory' AND NOT waiter.granted
            AND holder.granted AND holder.pid = ${holderPid}
          ) AS waiting
        `;
        if (rows[0].waiting) {
          waiting = true;
          break;
        }
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      release();
      const results = await Promise.all([first, second]);
      expect(waiting).toBe(true);
      expect(observed).toEqual([0, 1]);
      expect(results.map(({ status }) => status)).toEqual([
        'AWARDED',
        'CAPPED',
      ]);
      expect(await evidence()).toEqual([1, 2, 1, 1]);
    } finally {
      clearTimeout(deadline);
      release();
      await Promise.allSettled(second ? [first, second] : [first]);
      spy.mockRestore();
    }
  });
});
