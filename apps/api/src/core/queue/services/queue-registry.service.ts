import {
  Inject,
  Injectable,
  type BeforeApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import type IORedis from 'ioredis';
import {
  DSS_QUEUE_NAMES,
  type DeadLetterIntegrationEventJob,
  type IntegrationEventJob,
  type MediaProcessingJob,
  type PasswordRecoveryJob,
  type EmailVerificationJob,
  type SecurityEmailAlertJob,
} from '@dss/jobs';
import { REDIS_CONNECTION } from '../../cache';

@Injectable()
export class QueueRegistryService
  implements OnModuleInit, BeforeApplicationShutdown
{
  readonly integrationEvents: Queue<IntegrationEventJob>;
  readonly integrationEventDeadLetters: Queue<DeadLetterIntegrationEventJob>;
  readonly mediaProcessing: Queue<MediaProcessingJob>;
  readonly passwordRecovery: Queue<PasswordRecoveryJob>;
  readonly emailVerification: Queue<EmailVerificationJob>;
  readonly securityEmailAlerts: Queue<SecurityEmailAlertJob>;
  constructor(@Inject(REDIS_CONNECTION) connection: IORedis) {
    this.securityEmailAlerts = new Queue(
      DSS_QUEUE_NAMES.SECURITY_EMAIL_ALERTS,
      {
        connection,
      },
    );
    this.emailVerification = new Queue(DSS_QUEUE_NAMES.EMAIL_VERIFICATION, {
      connection,
    });
    this.passwordRecovery = new Queue(DSS_QUEUE_NAMES.PASSWORD_RECOVERY, {
      connection,
    });
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
  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.passwordRecovery.waitUntilReady(),
      this.emailVerification.waitUntilReady(),
      this.securityEmailAlerts.waitUntilReady(),
      this.integrationEvents.waitUntilReady(),
      this.integrationEventDeadLetters.waitUntilReady(),
      this.mediaProcessing.waitUntilReady(),
    ]);
  }
  async beforeApplicationShutdown(): Promise<void> {
    await this.passwordRecovery.close();
    await this.emailVerification.close();
    await this.securityEmailAlerts.close();
    await this.integrationEvents.close();
    await this.integrationEventDeadLetters.close();
    await this.mediaProcessing.close();
  }
}
