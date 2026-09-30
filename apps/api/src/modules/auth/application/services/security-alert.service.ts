import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SecurityAlertKind } from '@dss/jobs';
import { QueueRegistryService } from '@api/core/queue/services/queue-registry.service';

@Injectable()
export class SecurityAlertService {
  constructor(private readonly queues: QueueRegistryService) {}

  async notify(kind: SecurityAlertKind, email: string): Promise<void> {
    const eventId = randomUUID();
    try {
      await this.queues.securityEmailAlerts.add(
        'security-email-alert.v1',
        {
          eventId,
          kind,
          email: email.trim().toLowerCase(),
          occurredAt: new Date().toISOString(),
        },
        {
          jobId: eventId,
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch {
      // The credential change is already committed. Mail transport must not
      // turn a successful security operation into a misleading API failure.
    }
  }
}
