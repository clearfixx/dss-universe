import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import type IORedis from 'ioredis';
import { DSS_QUEUE_NAMES, type IntegrationEventJob } from '@dss/jobs';
import { REDIS_CONNECTION } from '../../cache';

@Injectable()
export class QueueRegistryService implements OnApplicationShutdown {
  readonly integrationEvents: Queue<IntegrationEventJob>;
  constructor(@Inject(REDIS_CONNECTION) connection: IORedis) {
    this.integrationEvents = new Queue(DSS_QUEUE_NAMES.INTEGRATION_EVENTS, {
      connection,
    });
  }
  async onApplicationShutdown(): Promise<void> {
    await this.integrationEvents.close();
  }
}
