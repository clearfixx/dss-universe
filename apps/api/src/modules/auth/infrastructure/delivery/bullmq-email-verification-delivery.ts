/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/delivery/bullmq-email-verification-delivery.ts
 *
 * 🎯 Purpose:
 * Adapts the private Auth delivery capability to the existing BullMQ queue.
 *
 * 🧠 Responsibilities:
 * • allowlists the delivery payload;
 * • preserves job version, retry and cleanup policy;
 * • propagates enqueue errors to application policy.
 *
 * 🏗️ Architecture:
 * Private infrastructure adapter; application services never receive the registry.
 *
 * ⚠️ Important:
 * Enqueue does not prove SMTP delivery. Never copy arbitrary credential fields.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { EmailVerificationJob } from '@dss/jobs';
import { QueueRegistryService } from '@api/core/queue/services/queue-registry.service';
import type { EmailVerificationDelivery } from '../../domain/contracts/email-verification-delivery.interface';

@Injectable()
export class BullmqEmailVerificationDelivery implements EmailVerificationDelivery {
  constructor(private readonly queues: QueueRegistryService) {}

  async enqueue(request: Readonly<EmailVerificationJob>): Promise<void> {
    await this.queues.emailVerification.add(
      'email-verification.v1',
      {
        userId: request.userId,
        email: request.email,
        requestedAt: request.requestedAt,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }
}
