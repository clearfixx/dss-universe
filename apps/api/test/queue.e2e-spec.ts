import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Worker } from 'bullmq';
import {
  DSS_QUEUE_NAMES,
  processIntegrationEvent,
  type IntegrationEventJob,
} from '@dss/jobs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import { createEventEnvelope, OutboxWriterService } from '../src/core/events';
import {
  OutboxDispatcherService,
  QueueRegistryService,
} from '../src/core/queue';

describe('Outbox queue delivery (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let outbox: OutboxWriterService;
  let dispatcher: OutboxDispatcherService;
  let queues: QueueRegistryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    outbox = app.get(OutboxWriterService);
    dispatcher = app.get(OutboxDispatcherService);
    queues = app.get(QueueRegistryService);
  });

  it('delivers an event once with a deterministic job identity', async () => {
    const event = createEventEnvelope({
      name: 'platform.queue.verified',
      version: 1,
      category: 'integration',
      producer: 'events',
      payload: { verified: true },
    });
    await prisma.transaction((transaction) =>
      outbox.append(transaction, event),
    );
    let processed = 0;
    const worker = new Worker<IntegrationEventJob>(
      DSS_QUEUE_NAMES.INTEGRATION_EVENTS,
      (job) => {
        processed += 1;
        return Promise.resolve(processIntegrationEvent(job.data));
      },
      { connection: { host: '127.0.0.1', port: 6380 } },
    );
    const completed = new Promise<void>((resolve, reject) => {
      worker.once('completed', () => resolve());
      worker.once('failed', (_job, error) => reject(error));
    });

    await expect(dispatcher.dispatchPending()).resolves.toBe(1);
    await completed;
    await expect(
      prisma.outboxEvent.findUnique({ where: { id: event.id } }),
    ).resolves.toMatchObject({ status: 'PUBLISHED' });
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: { status: 'PENDING', publishedAt: null },
    });
    await expect(dispatcher.dispatchPending()).resolves.toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(processed).toBe(1);

    await worker.close();
    const job = await queues.integrationEvents.getJob(event.id);
    await job?.remove();
    await prisma.outboxEvent.delete({ where: { id: event.id } });
  });

  afterAll(async () => {
    await app.close();
  });
});
