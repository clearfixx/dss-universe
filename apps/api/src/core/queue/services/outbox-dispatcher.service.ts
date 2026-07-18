import { Injectable } from '@nestjs/common';
import { DSS_JOB_NAMES } from '@dss/jobs';
import { PrismaService } from '../../database';
import { QueueRegistryService } from './queue-registry.service';

@Injectable()
export class OutboxDispatcherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueueRegistryService,
  ) {}
  async dispatchPending(limit = 50): Promise<number> {
    const candidates = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING', availableAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    let dispatched = 0;
    for (const event of candidates) {
      const claim = await this.prisma.outboxEvent.updateMany({
        where: { id: event.id, status: 'PENDING' },
        data: {
          status: 'PROCESSING',
          lockedAt: new Date(),
          lockedBy: process.pid.toString(),
        },
      });
      if (claim.count === 0) continue;
      try {
        await this.queues.integrationEvents.add(
          DSS_JOB_NAMES.DISPATCH_INTEGRATION_EVENT,
          {
            eventId: event.id,
            eventName: event.eventName,
            eventVersion: event.eventVersion,
            category: event.eventCategory,
            producer: event.producer,
            payload: event.payload,
            occurredAt: event.occurredAt.toISOString(),
            ...(event.metadata ? { metadata: event.metadata } : {}),
            ...(event.aggregateType
              ? { aggregateType: event.aggregateType }
              : {}),
            ...(event.aggregateId ? { aggregateId: event.aggregateId } : {}),
            ...(event.actorId ? { actorId: event.actorId } : {}),
            ...(event.correlationId
              ? { correlationId: event.correlationId }
              : {}),
            ...(event.causationId ? { causationId: event.causationId } : {}),
          },
          {
            jobId: event.id,
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: false,
            removeOnFail: false,
          },
        );
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
            lastError: null,
          },
        });
        dispatched += 1;
      } catch (error) {
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PENDING',
            attempts: { increment: 1 },
            availableAt: new Date(Date.now() + 1000),
            lockedAt: null,
            lockedBy: null,
            lastError:
              error instanceof Error ? error.message : 'Unknown queue error',
          },
        });
      }
    }
    return dispatched;
  }

  async recoverStaleProcessing(maxAgeMs = 60_000): Promise<number> {
    const result = await this.prisma.outboxEvent.updateMany({
      where: {
        status: 'PROCESSING',
        lockedAt: { lt: new Date(Date.now() - maxAgeMs) },
      },
      data: {
        status: 'PENDING',
        lockedAt: null,
        lockedBy: null,
        attempts: { increment: 1 },
        lastError: 'Recovered stale dispatcher lock.',
      },
    });
    return result.count;
  }
}
