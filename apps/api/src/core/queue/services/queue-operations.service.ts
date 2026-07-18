/**
 * DSS File Passport
 * File: apps/api/src/core/queue/services/queue-operations.service.ts
 * Purpose: Provides safe queue inspection and retry operations for Maintenance Center.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database';
import { QueueRegistryService } from './queue-registry.service';

@Injectable()
export class QueueOperationsService {
  constructor(
    private readonly queues: QueueRegistryService,
    private readonly prisma: PrismaService,
  ) {}
  getMetrics() {
    return this.queues.integrationEvents.getJobCounts(
      'waiting',
      'active',
      'delayed',
      'completed',
      'failed',
    );
  }
  async listFailed(limit = 50) {
    return this.queues.integrationEvents.getFailed(0, Math.max(0, limit - 1));
  }
  async retryFailed(jobId: string): Promise<void> {
    const job = await this.queues.integrationEvents.getJob(jobId);
    if (!job) throw new NotFoundException(`Queue job ${jobId} was not found.`);
    await job.retry('failed');
    await this.prisma.deadLetterEvent.updateMany({
      where: { eventId: job.data.eventId, resolvedAt: null },
      data: { resolvedAt: new Date() },
    });
  }
}
