/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/delivery/bullmq-security-alert-delivery.ts
 *
 * 🎯 Purpose:
 * Adapts the private Auth alert capability to the existing security mail queue.
 *
 * 🧠 Responsibilities:
 * • allowlists the versioned delivery payload;
 * • preserves job identity, attempts and retention settings;
 * • propagates transport failure to the caller's best-effort policy.
 *
 * 🏗️ Architecture:
 * Infrastructure adapter; no queue registry crosses the application port.
 *
 * ⚠️ Important:
 * Enqueue is not proof of SMTP delivery or durable transactional publication.
 * Never copy arbitrary future payload fields or credential material.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { SecurityEmailAlertJob } from '@dss/jobs';
import { QueueRegistryService } from '@api/core/queue/services/queue-registry.service';
import type { SecurityAlertDelivery } from '../../domain/contracts/security-alert-delivery.interface';

@Injectable()
export class BullmqSecurityAlertDelivery implements SecurityAlertDelivery {
  constructor(private readonly queues: QueueRegistryService) {}

  async enqueue(alert: Readonly<SecurityEmailAlertJob>): Promise<void> {
    await this.queues.securityEmailAlerts.add(
      'security-email-alert.v1',
      {
        eventId: alert.eventId,
        kind: alert.kind,
        email: alert.email,
        occurredAt: alert.occurredAt,
      },
      {
        jobId: alert.eventId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
}
