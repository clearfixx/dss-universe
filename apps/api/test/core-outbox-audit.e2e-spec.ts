/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Events
 * 📄 File: apps/api/test/core-outbox-audit.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies actual Outbox claims, atomic evidence and stale-attempt fencing.
 *
 * 🧠 Responsibilities:
 * • uses fully migrated isolated PostgreSQL and real dispatcher persistence;
 * • controls only the queue boundary and simulated age of a claimed row;
 * • verifies late success/failure cannot modify successor ownership or state.
 *
 * 🏗️ Architecture:
 * Test-only queue double; no live BullMQ delivery or consumer claim.
 *
 * ⚠️ Important:
 * Queue delivery is doubled; only database ownership and state are certified here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createEventEnvelope, OutboxWriterService } from '../src/core/events';
import { AuditWriterService } from '../src/core/audit/services/audit-writer.service';
import { AuditRedactionService } from '../src/core/audit/services/audit-redaction.service';
import { OutboxDispatcherService } from '../src/core/queue/services/outbox-dispatcher.service';
import type { QueueRegistryService } from '../src/core/queue/services/queue-registry.service';
import type { PrismaService } from '../src/core/database';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Core Outbox persistence and fencing (e2e)', () => {
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

  it('retains normal queue failure backoff and stable job identity on retry', async () => {
    add.mockRejectedValueOnce(new Error('synthetic queue unavailable'));
    const startedAt = Date.now();
    expect(await dispatcher.dispatchPending()).toBe(0);
    const failedAt = Date.now();
    const failed = await fixture.prisma.outboxEvent.findUniqueOrThrow({
      where: { id: eventId },
    });
    expect(failed).toMatchObject({
      status: 'PENDING',
      attempts: 1,
      lockedBy: null,
      lockedAt: null,
      publishedAt: null,
      lastError: 'synthetic queue unavailable',
    });
    expect(failed.availableAt.getTime()).toBeGreaterThanOrEqual(
      startedAt + 1000,
    );
    expect(failed.availableAt.getTime()).toBeLessThanOrEqual(failedAt + 1000);
    await fixture.prisma.outboxEvent.update({
      where: { id: eventId },
      data: { availableAt: new Date(0) },
    });
    expect(await dispatcher.dispatchPending()).toBe(1);
    expect(
      await fixture.prisma.outboxEvent.findUniqueOrThrow({
        where: { id: eventId },
      }),
    ).toMatchObject({
      status: 'PUBLISHED',
      attempts: 1,
      lockedBy: null,
      lockedAt: null,
      lastError: null,
    });
    for (const call of [1, 2])
      expect(add).toHaveBeenNthCalledWith(
        call,
        expect.any(String),
        expect.objectContaining({
          eventId,
          eventName: 'audit.synthetic.v1',
          payload: { reference: 'synthetic-only' },
        }),
        {
          jobId: eventId,
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
  });

  it('retains current-owner retry when publication persistence fails after enqueue', async () => {
    let failPublication = true;
    const client = fixture.prisma.$extends({
      query: {
        outboxEvent: {
          updateMany({ args, query }) {
            if (args.data.status === 'PUBLISHED' && failPublication) {
              failPublication = false;
              throw new Error('synthetic publication persistence failure');
            }
            return query(args);
          },
        },
      },
    });
    const dispatch = new OutboxDispatcherService(
      client as unknown as PrismaService,
      {
        integrationEvents: { add },
      } as unknown as QueueRegistryService,
    );
    expect(await dispatch.dispatchPending()).toBe(0);
    expect(add).toHaveBeenCalledTimes(1);
    expect(
      await fixture.prisma.outboxEvent.findUniqueOrThrow({
        where: { id: eventId },
      }),
    ).toMatchObject({
      status: 'PENDING',
      attempts: 1,
      lockedBy: null,
      lockedAt: null,
      publishedAt: null,
      lastError: 'synthetic publication persistence failure',
    });
    await fixture.prisma.outboxEvent.update({
      where: { id: eventId },
      data: { availableAt: new Date(0) },
    });
    expect(await dispatch.dispatchPending()).toBe(1);
    expect(
      await fixture.prisma.outboxEvent.findUniqueOrThrow({
        where: { id: eventId },
      }),
    ).toMatchObject({
      status: 'PUBLISHED',
      attempts: 1,
      lockedBy: null,
      lastError: null,
    });
    for (const call of [1, 2])
      expect(add).toHaveBeenNthCalledWith(
        call,
        expect.any(String),
        expect.objectContaining({ eventId }),
        expect.objectContaining({ jobId: eventId }),
      );
  });

  it.each([
    ['success', 'PUBLISHED'],
    ['failure', 'PUBLISHED'],
    ['success', 'PROCESSING'],
    ['failure', 'PROCESSING'],
    ['success', 'PENDING'],
    ['failure', 'PENDING'],
  ] as const)(
    'fences old %s while successor state is %s',
    async (outcome, successor) => {
      let ready!: () => void;
      const observed = new Promise<void>((resolve) => {
        ready = resolve;
      });
      let release!: () => void;
      const barrier = new Promise<void>((resolve) => {
        release = resolve;
      });
      let entered = false;
      let successorReady!: () => void;
      const successorObserved = new Promise<void>((resolve) => {
        successorReady = resolve;
      });
      let releaseSuccessor!: () => void;
      const successorBarrier = new Promise<void>((resolve) => {
        releaseSuccessor = resolve;
      });
      let successorEntered = false;
      let newer: Promise<number> | undefined;
      add.mockImplementationOnce(async () => {
        entered = true;
        ready();
        await barrier;
        if (outcome === 'failure')
          throw new Error('synthetic late queue failure');
        return { id: 'synthetic-old-job' };
      });
      const deadline = setTimeout(() => {
        ready();
        release();
        successorReady();
        releaseSuccessor();
      }, 1500);
      const old = dispatcher.dispatchPending();
      try {
        await observed;
        expect(entered).toBe(true);
        const firstClaim = await fixture.prisma.outboxEvent.findUniqueOrThrow({
          where: { id: eventId },
        });
        expect(firstClaim.status).toBe('PROCESSING');
        expect(firstClaim.lockedBy).toMatch(
          new RegExp(`^${process.pid}:[0-9a-f-]{36}$`),
        );
        // Age only this owned fixture claim; retain default recovery policy.
        await fixture.prisma.outboxEvent.update({
          where: { id: eventId },
          data: { lockedAt: new Date(Date.now() - 61000) },
        });
        expect(await dispatcher.recoverStaleProcessing()).toBe(1);
        if (successor === 'PUBLISHED')
          expect(await dispatcher.dispatchPending()).toBe(1);
        if (successor === 'PROCESSING') {
          add.mockImplementationOnce(async () => {
            successorEntered = true;
            successorReady();
            await successorBarrier;
            return { id: 'synthetic-new-job' };
          });
          newer = dispatcher.dispatchPending();
          await successorObserved;
          expect(successorEntered).toBe(true);
        }
        const beforeOldCompletion =
          await fixture.prisma.outboxEvent.findUniqueOrThrow({
            where: { id: eventId },
          });
        expect(beforeOldCompletion.status).toBe(successor);
        if (successor === 'PROCESSING') {
          expect(beforeOldCompletion.lockedBy).not.toBe(firstClaim.lockedBy);
          expect(beforeOldCompletion.lockedBy).not.toBeNull();
        }
        release();
        expect(await old).toBe(0);
        const final = await fixture.prisma.outboxEvent.findUniqueOrThrow({
          where: { id: eventId },
        });
        expect(final).toEqual(beforeOldCompletion);
        expect(final.attempts).toBe(1);
        expect(add).toHaveBeenCalledTimes(successor === 'PENDING' ? 1 : 2);
        if (newer) {
          releaseSuccessor();
          expect(await newer).toBe(1);
          expect(
            await fixture.prisma.outboxEvent.findUniqueOrThrow({
              where: { id: eventId },
            }),
          ).toMatchObject({
            status: 'PUBLISHED',
            lockedBy: null,
            lockedAt: null,
          });
        }
      } finally {
        clearTimeout(deadline);
        release();
        releaseSuccessor();
        await Promise.allSettled([old]);
        if (newer) await Promise.allSettled([newer]);
      }
    },
  );
});
