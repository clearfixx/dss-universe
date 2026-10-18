/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Events Audit
 * 📄 File: apps/api/test/core-outbox-audit.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies actual Outbox claims and characterizes stale-attempt completion.
 *
 * 🧠 Responsibilities:
 * • uses fully migrated isolated PostgreSQL and real dispatcher persistence;
 * • controls only the queue boundary and simulated age of a claimed row;
 * • preserves undesired-state evidence without changing runtime behavior.
 *
 * 🏗️ Architecture:
 * Test-only queue double; no live BullMQ delivery or consumer claim.
 *
 * ⚠️ Important:
 * Stale-attempt assertions characterize a risk, not an accepted correction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createEventEnvelope, OutboxWriterService } from '../src/core/events';
import { AuditWriterService } from '../src/core/audit/services/audit-writer.service';
import { AuditRedactionService } from '../src/core/audit/services/audit-redaction.service';
import { OutboxDispatcherService } from '../src/core/queue/services/outbox-dispatcher.service';
import type { QueueRegistryService } from '../src/core/queue/services/queue-registry.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Core Outbox persistence audit (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let dispatcher: OutboxDispatcherService;
  let eventId: string;
  const add = jest.fn(() => Promise.resolve({ id: 'synthetic-queue-job' }));
  beforeEach(async () => {
    add.mockReset();
    add.mockResolvedValue({ id: 'synthetic-queue-job' });
    fixture = await createIsolatedApiSchemaFixture();
    const event = createEventEnvelope({
      name: 'audit.synthetic.v1',
      version: 1,
      category: 'integration',
      producer: 'synthetic-audit',
      payload: { reference: 'synthetic-only' },
    });
    eventId = event.id;
    await fixture.prisma.$transaction((transaction) =>
      new OutboxWriterService().append(transaction, event),
    );
    dispatcher = new OutboxDispatcherService(fixture.prisma, {
      integrationEvents: { add },
    } as unknown as QueueRegistryService);
  }, 60000);
  afterEach(async () => {
    await fixture?.close();
  });

  it('rolls back primary and Audit writes when real Outbox uniqueness rejects', async () => {
    const key = `audit.core.${eventId}`;
    const audit = new AuditWriterService(new AuditRedactionService());
    await expect(
      fixture.prisma.$transaction(async (transaction) => {
        await transaction.permission.create({
          data: { key, label: 'Synthetic primary state' },
        });
        await audit.append(transaction, {
          action: 'audit.synthetic',
          actorType: 'SYSTEM',
          metadata: { token: 'synthetic-only' },
        });
        await new OutboxWriterService().append(
          transaction,
          createEventEnvelope({
            id: eventId,
            name: 'audit.duplicate.v1',
            version: 1,
            category: 'integration',
            producer: 'synthetic-audit',
            payload: {},
          }),
        );
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(
      await fixture.prisma.permission.findUnique({ where: { key } }),
    ).toBeNull();
    expect(
      await fixture.prisma.auditRecord.count({
        where: { action: 'audit.synthetic' },
      }),
    ).toBe(0);
    expect(await fixture.prisma.outboxEvent.count()).toBe(1);
    expect(
      await fixture.prisma.outboxEvent.findUniqueOrThrow({
        where: { id: eventId },
      }),
    ).toMatchObject({ eventName: 'audit.synthetic.v1', status: 'PENDING' });
  });

  it('commits primary, redacted Audit metadata and Outbox together', async () => {
    const key = `audit.core.${eventId}`;
    await fixture.prisma.$transaction(async (transaction) => {
      await transaction.permission.create({
        data: { key, label: 'Synthetic primary state' },
      });
      await new AuditWriterService(new AuditRedactionService()).append(
        transaction,
        {
          action: 'audit.synthetic',
          actorType: 'SYSTEM',
          metadata: {
            password: 'synthetic-only',
            nested: { token: 'synthetic-only', note: 'retained' },
          },
        },
      );
      await new OutboxWriterService().append(
        transaction,
        createEventEnvelope({
          name: 'audit.committed.v1',
          version: 1,
          category: 'integration',
          producer: 'synthetic-audit',
          payload: { key },
        }),
      );
    });
    expect(
      await fixture.prisma.permission.findUnique({ where: { key } }),
    ).not.toBeNull();
    expect(
      await fixture.prisma.auditRecord.findFirstOrThrow({
        where: { action: 'audit.synthetic' },
      }),
    ).toMatchObject({
      metadata: {
        password: '[REDACTED]',
        nested: { token: '[REDACTED]', note: 'retained' },
      },
    });
    expect(await fixture.prisma.outboxEvent.count()).toBe(2);
  });

  it('CAS-claims a pending row once across two concurrent dispatchers', async () => {
    const counts = await Promise.all([
      dispatcher.dispatchPending(),
      dispatcher.dispatchPending(),
    ]);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(add).toHaveBeenCalledTimes(1);
    expect(
      await fixture.prisma.outboxEvent.findUniqueOrThrow({
        where: { id: eventId },
      }),
    ).toMatchObject({
      status: 'PUBLISHED',
      lockedAt: null,
      lockedBy: null,
      lastError: null,
    });
    expect(await dispatcher.dispatchPending()).toBe(0);
  });

  it('characterizes an old failed attempt reopening a recovered published row', async () => {
    let ready!: () => void;
    const observed = new Promise<void>((resolve) => {
      ready = resolve;
    });
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered = false;
    add.mockImplementationOnce(async () => {
      entered = true;
      ready();
      await barrier;
      throw new Error('synthetic late queue failure');
    });
    const deadline = setTimeout(() => {
      ready();
      release();
    }, 1500);
    const old = dispatcher.dispatchPending();
    try {
      await observed;
      expect(entered).toBe(true);
      expect(
        await fixture.prisma.outboxEvent.findUniqueOrThrow({
          where: { id: eventId },
        }),
      ).toMatchObject({ status: 'PROCESSING' });
      // Age only this owned fixture claim; retain default recovery policy.
      await fixture.prisma.outboxEvent.update({
        where: { id: eventId },
        data: { lockedAt: new Date(Date.now() - 61000) },
      });
      expect(await dispatcher.recoverStaleProcessing()).toBe(1);
      expect(await dispatcher.dispatchPending()).toBe(1);
      expect(
        await fixture.prisma.outboxEvent.findUniqueOrThrow({
          where: { id: eventId },
        }),
      ).toMatchObject({ status: 'PUBLISHED' });
      release();
      expect(await old).toBe(0);
      const final = await fixture.prisma.outboxEvent.findUniqueOrThrow({
        where: { id: eventId },
      });
      expect(final.status).toBe('PENDING');
      expect(final.publishedAt).not.toBeNull();
      expect(final.attempts).toBe(2);
      expect(add).toHaveBeenCalledTimes(2);
    } finally {
      clearTimeout(deadline);
      release();
      await Promise.allSettled([old]);
    }
  });
});
