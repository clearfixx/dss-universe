/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Persistence Audit
 * 📄 File: apps/api/test/community-points-cap-audit.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Regresses DEBT-062 with actual service, repository and migrated PostgreSQL transactions.
 *
 * 🧠 Responsibilities:
 * • distinguishes sequential daily caps from independent-event concurrency;
 * • observes real counts before synchronizing the test schedule;
 * • verifies committed ledger, processed markers, audit and outbox evidence.
 *
 * 🏗️ Architecture:
 * Test-only root composition in an isolated fully migrated fixture schema.
 *
 * ⚠️ Important:
 * Concurrent events must not exceed the shared UTC-day quota.
 * No count/result mock, changed transaction isolation, timeout or history protection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import type { IntegrationEventJob } from '@dss/jobs';
import type { TransactionClient } from '../src/core/database';
import { AuditWriterService } from '../src/core/audit/services/audit-writer.service';
import { AuditRedactionService } from '../src/core/audit/services/audit-redaction.service';
import { OutboxWriterService } from '../src/core/events/services/outbox-writer.service';
import { CommunityPointsService } from '../src/modules/community-points/application/services/community-points.service';
import { PrismaCommunityPointsRepository } from '../src/modules/community-points/infrastructure/repositories/prisma-community-points.repository';
import { PrismaProfileExistenceReader } from '../src/modules/users/infrastructure/repositories/prisma-profile-existence.reader';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Community Points cap audit / DEBT-062 (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let repository: PrismaCommunityPointsRepository;
  let service: CommunityPointsService;
  let outbox: OutboxWriterService;
  let userId: string;
  let eventName: string;
  beforeEach(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    userId = randomUUID();
    eventName = `audit.daily-cap.${randomUUID()}.v1`;
    await fixture.prisma.user.create({
      data: {
        id: userId,
        username: userId,
        email: userId + '@dss.test',
        passwordHash: 'synthetic-never-delivered',
      },
    });
    await fixture.prisma.communityPointRule.create({
      data: {
        key: eventName,
        eventName,
        points: 1,
        dailyLimit: 1,
        enabled: true,
      },
    });
    outbox = new OutboxWriterService();
    repository = new PrismaCommunityPointsRepository(
      fixture.prisma,
      new AuditWriterService(new AuditRedactionService()),
      outbox,
    );
    service = new CommunityPointsService(
      repository,
      new PrismaProfileExistenceReader(fixture.prisma),
    );
  }, 60000);
  afterEach(async () => {
    jest.restoreAllMocks();
    await fixture?.close();
  });
  function event(): IntegrationEventJob {
    return {
      eventId: randomUUID(),
      eventName,
      eventVersion: 1,
      category: 'integration',
      producer: 'audit.synthetic',
      aggregateType: 'SyntheticActivity',
      aggregateId: randomUUID(),
      payload: { userId },
      occurredAt: '2026-10-18T12:00:00.000Z',
    };
  }
  it('keeps concurrent duplicate delivery idempotent', async () => {
    const job = event();
    const results = await Promise.all([
      service.consume(job),
      service.consume(job),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual([
      'AWARDED',
      'DUPLICATE',
    ]);
    expect(await repository.balance(userId)).toBe(1);
    expect(await fixture.prisma.processedEvent.count()).toBe(1);
  });
  it('separates UTC days, including offset representations of the same day', async () => {
    expect(
      (
        await service.consume({
          ...event(),
          occurredAt: '2026-10-18T23:59:59.999Z',
        })
      ).status,
    ).toBe('AWARDED');
    expect(
      (
        await service.consume({
          ...event(),
          occurredAt: '2026-10-19T01:00:00+02:00',
        })
      ).status,
    ).toBe('CAPPED');
    expect(
      (
        await service.consume({
          ...event(),
          occurredAt: '2026-10-19T00:00:00.000Z',
        })
      ).status,
    ).toBe('AWARDED');
    expect(await repository.balance(userId)).toBe(2);
  });
  it('does not cap unlimited rules', async () => {
    await fixture.prisma.communityPointRule.update({
      where: { key: eventName },
      data: { dailyLimit: null },
    });
    const results = await Promise.all(
      Array.from({ length: 4 }, () => service.consume(event())),
    );
    expect(results.map(({ status }) => status)).toEqual(
      Array(4).fill('AWARDED'),
    );
    expect(await repository.balance(userId)).toBe(4);
  });
  it.each(['user', 'rule'] as const)(
    'keeps concurrent quotas independent by %s',
    async (dimension) => {
      const other = randomUUID();
      if (dimension === 'user') {
        await fixture.prisma.user.create({
          data: {
            id: other,
            username: other,
            email: `${other}@dss.test`,
            passwordHash: 'synthetic-never-delivered',
          },
        });
      } else {
        await fixture.prisma.communityPointRule.create({
          data: {
            key: other,
            eventName: other,
            points: 1,
            dailyLimit: 1,
            enabled: true,
          },
        });
      }
      const otherEvent = (): IntegrationEventJob => ({
        ...event(),
        ...(dimension === 'user'
          ? { payload: { userId: other } }
          : { eventName: other }),
      });
      const results = await Promise.all([
        service.consume(event()),
        service.consume(otherEvent()),
        service.consume(event()),
        service.consume(otherEvent()),
      ]);
      expect(results.map(({ status }) => status).sort()).toEqual([
        'AWARDED',
        'AWARDED',
        'CAPPED',
        'CAPPED',
      ]);
      expect(await repository.balance(userId)).toBe(
        dimension === 'user' ? 1 : 2,
      );
      if (dimension === 'user') expect(await repository.balance(other)).toBe(1);
      expect(await fixture.prisma.processedEvent.count()).toBe(4);
    },
  );
  it('rolls back ledger, marker and audit on Outbox failure and releases the quota', async () => {
    const job = event();
    const failure = jest
      .spyOn(outbox, 'append')
      .mockRejectedValueOnce(new Error('synthetic outbox failure'));
    await expect(service.consume(job)).rejects.toThrow(
      'synthetic outbox failure',
    );
    failure.mockRestore();
    expect(await repository.balance(userId)).toBe(0);
    expect(await fixture.prisma.processedEvent.count()).toBe(0);
    expect(
      await fixture.prisma.auditRecord.count({
        where: { action: 'community-points.awarded' },
      }),
    ).toBe(0);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: { producer: 'dss.api.community-points' },
      }),
    ).toBe(0);
    expect((await service.consume(job)).status).toBe('AWARDED');
    expect((await service.consume(event())).status).toBe('CAPPED');
  });
  it('enforces the configured one-award cap when events are consumed sequentially', async () => {
    expect((await service.consume(event())).status).toBe('AWARDED');
    expect((await service.consume(event())).status).toBe('CAPPED');
    expect(await repository.balance(userId)).toBe(1);
    expect(await fixture.prisma.processedEvent.count()).toBe(2);
    expect(
      await fixture.prisma.auditRecord.count({
        where: { action: 'community-points.awarded' },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: { producer: 'dss.api.community-points' },
      }),
    ).toBe(1);
  });
  it('DEBT-062: serializes distinct events before counting the final daily slot', async () => {
    const counted = repository as unknown as {
      dailyAwardCount(
        transaction: TransactionClient,
        subjectId: string,
        ruleKey: string,
        at: Date,
      ): Promise<number>;
    };
    const original = counted.dailyAwardCount.bind(
      repository,
    ) as typeof counted.dailyAwardCount;
    const observed: number[] = [];
    let holderPid = 0;
    let firstCounted!: () => void;
    const countedFirst = new Promise<void>((resolve) => {
      firstCounted = resolve;
    });
    let release!: () => void;
    const rendezvous = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Bound test coordination only; production transaction deadlines are unchanged.
    const deadline = setTimeout(release, 1500);
    const spy = jest
      .spyOn(counted, 'dailyAwardCount')
      .mockImplementation(async (...args) => {
        const count = await original(...args);
        observed.push(count);
        if (observed.length === 1) {
          const rows = await args[0].$queryRaw<{ pid: number }[]>`
            SELECT pg_backend_pid() AS pid
          `;
          holderPid = rows[0].pid;
          firstCounted();
          await rendezvous;
        }
        return count;
      });
    const first = event();
    const second = event();
    try {
      const firstResult = service.consume(first);
      await countedFirst;
      const secondResult = service.consume(second);
      const observationEnds = Date.now() + 1000;
      let waiting = false;
      while (Date.now() < observationEnds) {
        const rows = await fixture.prisma.$queryRaw<{ waiting: boolean }[]>`
          SELECT EXISTS (
            SELECT 1 FROM pg_locks waiter
            JOIN pg_locks holder ON holder.locktype = waiter.locktype
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
      const results = await Promise.all([firstResult, secondResult]);
      expect(waiting).toBe(true);
      expect(observed).toEqual([0, 1]);
      expect(results.map(({ status }) => status)).toEqual([
        'AWARDED',
        'CAPPED',
      ]);
    } finally {
      clearTimeout(deadline);
      release();
      spy.mockRestore();
    }
    expect(await repository.balance(userId)).toBe(1);
    expect(
      await fixture.prisma.communityPointEntry.count({
        where: { userId, ruleKey: eventName },
      }),
    ).toBe(1);
    expect(await fixture.prisma.processedEvent.count()).toBe(2);
    expect(
      await fixture.prisma.auditRecord.count({
        where: { action: 'community-points.awarded' },
      }),
    ).toBe(1);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: { producer: 'dss.api.community-points' },
      }),
    ).toBe(1);
    expect((await service.consume(first)).status).toBe('DUPLICATE');
    expect((await service.consume(event())).status).toBe('CAPPED');
    expect(await fixture.prisma.processedEvent.count()).toBe(3);
  });
});
