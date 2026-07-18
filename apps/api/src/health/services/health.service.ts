import { Inject, Injectable } from '@nestjs/common';
import type IORedis from 'ioredis';
import { REDIS_CONNECTION } from '@api/core/cache';
import { PrismaService } from '@api/core/database';
import { QueueRegistryService } from '@api/core/queue';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CONNECTION) private readonly redis: IORedis,
    private readonly queues: QueueRegistryService,
  ) {}

  liveness() {
    return {
      status: 'ok' as const,
      service: 'dss-api',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async readiness() {
    const [database, redis, queues, workerHeartbeat] = await Promise.all([
      this.prisma.healthCheck(),
      this.checkRedis(),
      this.checkQueues(),
      this.redis.get('dss:worker:integration-events:heartbeat'),
    ]);
    return {
      status:
        database.status === 'up' &&
        redis.status === 'up' &&
        queues.status === 'up'
          ? ('ok' as const)
          : ('error' as const),
      database,
      redis,
      queues,
      worker: workerHeartbeat
        ? { status: 'up' as const, lastHeartbeat: workerHeartbeat }
        : { status: 'unknown' as const, lastHeartbeat: null },
      timestamp: new Date().toISOString(),
    };
  }

  async check() {
    return this.readiness();
  }

  private async checkRedis() {
    const startedAt = Date.now();
    try {
      await this.redis.ping();
      return { status: 'up' as const, latency: Date.now() - startedAt };
    } catch {
      return { status: 'down' as const, latency: Date.now() - startedAt };
    }
  }

  private async checkQueues() {
    const startedAt = Date.now();
    try {
      const counts = await this.queues.integrationEvents.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'failed',
      );
      return { status: 'up' as const, latency: Date.now() - startedAt, counts };
    } catch {
      return { status: 'down' as const, latency: Date.now() - startedAt };
    }
  }
}
