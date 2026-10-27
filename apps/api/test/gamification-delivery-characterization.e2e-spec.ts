/**
 * DSS Universe — Gamification Delivery Characterization
 * File: apps/api/test/gamification-delivery-characterization.e2e-spec.ts
 * Purpose: Verify existing Points rollback and replay on a migrated owned schema.
 * Ownership: test-only AppModule assembly, not production event dispatch.
 * Invariants: disposable DB, real ledger/Audit/Outbox, no queue or formula changes.
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import {
  IdempotentIntegrationEventProcessor,
  type IntegrationEventJob,
} from '@dss/jobs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import { OutboxWriterService } from '../src/core/events';
import { CommunityPointsService } from '../src/modules/community-points/application/services/community-points.service';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Gamification delivery boundaries (characterization, not automatic wiring)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let app: INestApplication;
  let points: CommunityPointsService;
  let outbox: OutboxWriterService;
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fixture.prisma)
      .compile();
    app = module.createNestApplication();
    await app.init();
    points = app.get(CommunityPointsService);
    outbox = app.get(OutboxWriterService);
  }, 60000);
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    await fixture?.close();
  });

  async function event(): Promise<IntegrationEventJob> {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `${id}@dss.invalid`,
        username: id,
        passwordHash: 'synthetic-not-a-login',
        status: 'ACTIVE',
      },
    });
    return {
      eventId: randomUUID(),
      eventName: 'comments.comment.created.v1',
      eventVersion: 1,
      category: 'integration',
      producer: 'synthetic.characterization',
      payload: { authorId: id },
      aggregateType: 'Comment',
      aggregateId: randomUUID(),
      occurredAt: new Date().toISOString(),
    };
  }
  async function counts() {
    const p = fixture.prisma;
    return {
      entries: await p.communityPointEntry.count(),
      markers: await p.processedEvent.count(),
      audit: await p.auditRecord.count(),
      outbox: await p.outboxEvent.count(),
    };
  }

  it('rolls back Points entry, owned marker and Audit when Outbox append fails', async () => {
    const input = await event();
    const before = await counts();
    const append = jest
      .spyOn(outbox, 'append')
      .mockRejectedValueOnce(new Error('synthetic Outbox failure'));
    await expect(points.consume(input)).rejects.toThrow(
      'synthetic Outbox failure',
    );
    expect(await counts()).toEqual(before);
    append.mockRestore();
    await expect(points.consume(input)).resolves.toMatchObject({
      status: 'AWARDED',
    });
    const after = await counts();
    expect(after).toEqual({
      entries: before.entries + 1,
      markers: before.markers + 1,
      audit: before.audit + 1,
      outbox: before.outbox + 1,
    });
  });

  it('replays the handler after outer marker failure without a second Points effect', async () => {
    const input = await event();
    const before = await counts();
    let marked = false;
    let markerCalls = 0;
    const statuses: string[] = [];
    const processor = new IdempotentIntegrationEventProcessor(
      'synthetic.outer',
      {
        hasProcessed: () => Promise.resolve(marked),
        markProcessed: () => {
          if (++markerCalls === 1)
            return Promise.reject(new Error('synthetic outer marker failure'));
          marked = true;
          return Promise.resolve();
        },
      },
      async (data) => {
        statuses.push((await points.consume(data)).status);
      },
    );
    await expect(processor.process(input)).rejects.toThrow(
      'synthetic outer marker failure',
    );
    const committed = await counts();
    expect(committed).toEqual({
      entries: before.entries + 1,
      markers: before.markers + 1,
      audit: before.audit + 1,
      outbox: before.outbox + 1,
    });
    await expect(processor.process(input)).resolves.toMatchObject({
      duplicate: false,
    });
    expect(statuses).toEqual(['AWARDED', 'DUPLICATE']);
    expect(await counts()).toEqual(committed);
    await expect(processor.process(input)).resolves.toMatchObject({
      duplicate: true,
    });
    expect(statuses).toHaveLength(2);
  });
});
