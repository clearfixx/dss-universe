/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Core Events
 * 📄 File: apps/api/src/core/events/services/outbox-writer.service.ts
 *
 * 🎯 Purpose:
 * Persists integration events inside an existing database transaction.
 *
 * ⚠️ Important:
 * A TransactionClient is mandatory. This prevents an outbox record from being
 * committed separately from the business state that produced it.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { TransactionClient } from '@api/core/database';

import type { EventEnvelope } from '../types/event-envelope.type';

@Injectable()
export class OutboxWriterService {
  async append(
    transaction: TransactionClient,
    event: EventEnvelope,
  ): Promise<string> {
    const record = await transaction.outboxEvent.create({
      data: {
        id: event.id,
        eventName: event.name,
        eventVersion: event.version,
        eventCategory: event.category,
        producer: event.producer,
        aggregateType: event.aggregate?.type,
        aggregateId: event.aggregate?.id,
        correlationId: event.correlationId,
        causationId: event.causationId,
        actorId: event.actorId,
        payload: event.payload as Prisma.InputJsonValue,
        metadata: event.metadata,
        occurredAt: new Date(event.occurredAt),
      },
      select: { id: true },
    });

    return record.id;
  }
}
