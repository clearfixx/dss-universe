/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Events Test Infrastructure
 * 📄 File: apps/api/test/outbox.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Proves that primary state and outbox events commit or roll back atomically.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database';
import { createEventEnvelope, OutboxWriterService } from '../src/core/events';

describe('Transactional outbox (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let outbox: OutboxWriterService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    outbox = app.get(OutboxWriterService);
  });

  it('commits primary state and its event in one transaction', async () => {
    const suffix = `${Date.now()}-commit`;
    const permissionKey = `phase4.outbox.${suffix}`;
    const event = createEventEnvelope({
      name: 'iam.permission.created',
      version: 1,
      category: 'integration',
      producer: 'iam',
      correlationId: `test-${suffix}`,
      payload: { permissionKey },
    });

    await prisma.transaction(async (transaction) => {
      await transaction.permission.create({
        data: { key: permissionKey, label: 'Phase 4 outbox test' },
      });
      await outbox.append(transaction, event);
    });

    await expect(
      prisma.permission.findUnique({ where: { key: permissionKey } }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.outboxEvent.findUnique({ where: { id: event.id } }),
    ).resolves.toMatchObject({
      eventName: 'iam.permission.created',
      eventVersion: 1,
      status: 'PENDING',
    });

    await prisma.outboxEvent.delete({ where: { id: event.id } });
    await prisma.permission.delete({ where: { key: permissionKey } });
  });

  it('rolls back primary state and event together', async () => {
    const suffix = `${Date.now()}-rollback`;
    const permissionKey = `phase4.outbox.${suffix}`;
    const event = createEventEnvelope({
      name: 'iam.permission.created',
      version: 1,
      category: 'integration',
      producer: 'iam',
      payload: { permissionKey },
    });

    await expect(
      prisma.transaction(async (transaction) => {
        await transaction.permission.create({
          data: { key: permissionKey, label: 'Must roll back' },
        });
        await outbox.append(transaction, event);
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    await expect(
      prisma.permission.findUnique({ where: { key: permissionKey } }),
    ).resolves.toBeNull();
    await expect(
      prisma.outboxEvent.findUnique({ where: { id: event.id } }),
    ).resolves.toBeNull();
  });

  afterAll(async () => {
    await app.close();
  });
});
