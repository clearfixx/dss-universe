/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Persistence Audit
 * 📄 File: apps/api/test/community-points-cap-audit.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Characterizes DEBT-062 with actual service, repository and migrated PostgreSQL transactions.
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
 * The overshoot assertion pins a defect, not desired policy or a completed fix.
 * No count/result mock, changed transaction isolation, timeout or history protection.
 * Replace this characterization with invariant regression in the separately approved fix.
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
    repository = new PrismaCommunityPointsRepository(
      fixture.prisma,
      new AuditWriterService(new AuditRedactionService()),
      new OutboxWriterService(),
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
  it('DEBT-062: distinct events both observe real zero counts and commit two awards past cap one', async () => {
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
    let release!: () => void;
    const rendezvous = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Fail the observation if both real reads cannot overlap; never fake either count.
    const deadline = setTimeout(release, 1500);
    const spy = jest
      .spyOn(counted, 'dailyAwardCount')
      .mockImplementation(async (...args) => {
        const count = await original(...args);
        observed.push(count);
        if (observed.length === 2) release();
        await rendezvous;
        return count;
      });
    const first = event();
    const second = event();
    try {
      const results = await Promise.all([
        service.consume(first),
        service.consume(second),
      ]);
      expect(observed).toEqual([0, 0]);
      expect(results.map(({ status }) => status)).toEqual([
        'AWARDED',
        'AWARDED',
      ]);
    } finally {
      clearTimeout(deadline);
      release();
      spy.mockRestore();
    }
    expect(await repository.balance(userId)).toBe(2);
    expect(
      await fixture.prisma.communityPointEntry.count({
        where: { userId, ruleKey: eventName },
      }),
    ).toBe(2);
    expect(await fixture.prisma.processedEvent.count()).toBe(2);
    expect(
      await fixture.prisma.auditRecord.count({
        where: { action: 'community-points.awarded' },
      }),
    ).toBe(2);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: { producer: 'dss.api.community-points' },
      }),
    ).toBe(2);
    expect((await service.consume(first)).status).toBe('DUPLICATE');
    expect((await service.consume(event())).status).toBe('CAPPED');
    expect(await fixture.prisma.processedEvent.count()).toBe(3);
  });
});
