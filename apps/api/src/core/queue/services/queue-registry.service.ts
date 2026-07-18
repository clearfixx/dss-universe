import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import type IORedis from 'ioredis';
import {
  DSS_QUEUE_NAMES,
  type DeadLetterIntegrationEventJob,
  type IntegrationEventJob,
  type MediaProcessingJob,
} from '@dss/jobs';
import { REDIS_CONNECTION } from '../../cache';

@Injectable()
export class QueueRegistryService implements OnApplicationShutdown {
  readonly integrationEvents: Queue<IntegrationEventJob>;
  readonly integrationEventDeadLetters: Queue<DeadLetterIntegrationEventJob>;
  readonly mediaProcessing: Queue<MediaProcessingJob>;
  constructor(@Inject(REDIS_CONNECTION) connection: IORedis) {
    this.integrationEvents = new Queue(DSS_QUEUE_NAMES.INTEGRATION_EVENTS, {
      connection,
    });
    this.integrationEventDeadLetters = new Queue(
      DSS_QUEUE_NAMES.INTEGRATION_EVENTS_DEAD_LETTER,
      { connection },
    );
    this.mediaProcessing = new Queue(DSS_QUEUE_NAMES.MEDIA_PROCESSING, {
      connection,
    });
  }
  async onApplicationShutdown(): Promise<void> {
    await this.integrationEvents.close();
    await this.integrationEventDeadLetters.close();
    await this.mediaProcessing.close();
  }
}
