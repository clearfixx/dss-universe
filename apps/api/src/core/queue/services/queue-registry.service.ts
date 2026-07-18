import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import type IORedis from 'ioredis';
import {
  DSS_QUEUE_NAMES,
  type DeadLetterIntegrationEventJob,
  type IntegrationEventJob,
} from '@dss/jobs';
import { REDIS_CONNECTION } from '../../cache';

@Injectable()
export class QueueRegistryService implements OnApplicationShutdown {
  readonly integrationEvents: Queue<IntegrationEventJob>;
  readonly integrationEventDeadLetters: Queue<DeadLetterIntegrationEventJob>;
  constructor(@Inject(REDIS_CONNECTION) connection: IORedis) {
    this.integrationEvents = new Queue(DSS_QUEUE_NAMES.INTEGRATION_EVENTS, {
      connection,
    });
    this.integrationEventDeadLetters = new Queue(
      DSS_QUEUE_NAMES.INTEGRATION_EVENTS_DEAD_LETTER,
      { connection },
    );
  }
  async onApplicationShutdown(): Promise<void> {
    await this.integrationEvents.close();
    await this.integrationEventDeadLetters.close();
  }
}
